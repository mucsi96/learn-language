import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CardData } from '../parser/types';
import { fetchJson } from '../utils/fetchJson';
import { languages } from '../shared/constants/languages';
import { MultiModelConsensusService } from '../multi-model-consensus.service';
import {
  CardCreationStrategy,
  CardCreationRequest,
  CardType
} from '../shared/types/card-creation.types';
import {
  ImageResponse
} from '../shared/types/image-generation.types';

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
  ): Promise<CardData> {
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
        progressCallback(20, 'Detecting gender with multiple models...');
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

      progressCallback(30, 'Translating to multiple languages with multiple models...');
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

      progressCallback(60, 'Generating example images...');
      const exampleImages = await Promise.all(
        word.examples.map(async (example, exampleIndex) => {
          const englishTranslation = exampleTranslations['en']?.[exampleIndex];
          if (!englishTranslation) {
            return [];
          }

          const [gptImageResponse, imagenImageResponse, nanoBananaProResponse] = await Promise.all([
            fetchJson<ImageResponse>(
              this.http,
              `/api/image`,
              {
                body: {
                  input: englishTranslation,
                  model: 'gpt-image-1'
                },
                method: 'POST',
              }
            ),
            fetchJson<ImageResponse>(
              this.http,
              `/api/image`,
              {
                body: {
                  input: englishTranslation,
                  model: 'google-imagen-4-ultra'
                },
                method: 'POST',
              }
            ),
            fetchJson<ImageResponse>(
              this.http,
              `/api/image`,
              {
                body: {
                  input: englishTranslation,
                  model: 'google-nano-banana-pro'
                },
                method: 'POST',
              }
            )
          ]);

          return [
            { id: gptImageResponse.id },
            { id: imagenImageResponse.id },
            { id: nanoBananaProResponse.id }
          ];
        })
      );

      progressCallback(80, 'Preparing vocabulary card data...');

      return {
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
          images: exampleImages[index] || []
        }))
      };

    } catch (error) {
      throw new Error(`Failed to prepare vocabulary card data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
