import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from '../utils/fetchJson';
import { languages } from '../shared/constants/languages';
import { MultiModelConsensusService } from '../multi-model-consensus.service';
import {
  CardCreationStrategy,
  CardCreationRequest,
  CardCreationResult,
  CardType,
  ImageGenerationInfo
} from '../shared/types/card-creation.types';

interface WordTypeResponse {
  type: string;
}

interface GenderResponse {
  gender: string;
}

interface TranslationResponse {
  translation: string;
  examples: string[];
}

@Injectable({
  providedIn: 'root',
})
export class VocabularyCardCreationStrategy implements CardCreationStrategy {
  readonly cardType: CardType = 'vocabulary';

  private readonly http = inject(HttpClient);
  private readonly consensusService = inject(MultiModelConsensusService);

  async createCardData(
    request: CardCreationRequest,
    progressCallback: (progress: number, step: string) => void
  ): Promise<CardCreationResult> {
    const { word } = request;

    try {
      progressCallback(10, 'Detecting word type with multiple models...');
      const wordType = await this.consensusService.callWithConsensus<WordTypeResponse>(
        'word_type',
        word.word,
        (model: string) => fetchJson<WordTypeResponse>(
          this.http,
          `/api/word-type?model=${model}`,
          {
            body: { word: word.word },
            method: 'POST',
          }
        ),
        (response: WordTypeResponse) => response.type
      );

      let gender: string | undefined;
      if (wordType.type === 'NOUN') {
        progressCallback(30, 'Detecting gender with multiple models...');
        const genderResponse = await this.consensusService.callWithConsensus<GenderResponse>(
          'gender',
          word.word,
          (model: string) => fetchJson<GenderResponse>(
            this.http,
            `/api/gender?model=${model}`,
            {
              body: { word: word.word },
              method: 'POST',
            }
          ),
          (response: GenderResponse) => response.gender
        );
        gender = genderResponse.gender;
      }

      progressCallback(50, 'Translating to multiple languages with multiple models...');
      const translations = await Promise.all(
        languages.map(async (languageCode) => {
          const translation = await this.consensusService.callWithConsensus<TranslationResponse>(
            `translation_${languageCode}`,
            JSON.stringify({ word: word.word, examples: word.examples, forms: word.forms }),
            (model: string) => fetchJson<TranslationResponse>(
              this.http,
              `/api/translate/${languageCode}?model=${model}`,
              {
                body: word,
                method: 'POST',
              }
            ),
            (response: TranslationResponse) => JSON.stringify({ translation: response.translation, examples: response.examples })
          );
          return { languageCode, translation };
        })
      );

      const translationMap = Object.fromEntries(
        translations.map(({ languageCode, translation }) => [
          languageCode,
          translation.translation
        ])
      );
      const exampleTranslations = Object.fromEntries(
        translations.map(({ languageCode, translation }) => [
          languageCode,
          translation.examples || []
        ])
      );

      progressCallback(80, 'Preparing vocabulary card data...');

      const imageGenerationInfos: ImageGenerationInfo[] = word.examples
        .map((_, exampleIndex) => {
          const englishTranslation = exampleTranslations['en']?.[exampleIndex];
          if (!englishTranslation) {
            return null;
          }
          return {
            cardId: word.id,
            exampleIndex,
            englishTranslation
          };
        })
        .filter((info): info is ImageGenerationInfo => info !== null);

      const cardData = {
        word: word.word,
        type: wordType.type,
        gender: gender,
        translation: translationMap,
        forms: word.forms,
        examples: word.examples.map((example, index) => ({
          ...Object.fromEntries([
            ['de', example],
            ...languages.map((languageCode) => [
              languageCode,
              exampleTranslations[languageCode]?.[index] || ''
            ])
          ]),
          isSelected: index === 0,
          images: []
        }))
      };

      return { cardData, imageGenerationInfos };

    } catch (error) {
      throw new Error(`Failed to prepare vocabulary card data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
