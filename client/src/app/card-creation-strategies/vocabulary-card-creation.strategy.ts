import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from '../utils/fetchJson';
import { languages } from '../shared/constants/languages';
import { MultiModelService } from '../multi-model.service';
import {
  CardCreationStrategy,
  CardCreationRequest,
  CardCreationResult,
  CardType,
  ImageGenerationInfo,
  ExtractionRequest,
  ExtractionResult,
  ExtractedItem
} from '../shared/types/card-creation.types';
import { Word, WordList } from '../parser/types';

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
  private readonly multiModelService = inject(MultiModelService);

  async extractItems(request: ExtractionRequest): Promise<ExtractionResult> {
    const { sourceId, pageNumber, x, y, width, height } = request;

    return this.multiModelService.call<WordList>(
      'word_extraction',
      (model: string) =>
        fetchJson<WordList>(
          this.http,
          `/api/source/${sourceId}/page/${pageNumber}/words?x=${x}&y=${y}&width=${width}&height=${height}&model=${model}`
        )
    );
  }

  getItemLabel(item: Word): string {
    return item.word;
  }

  getItems(result: ExtractionResult): ExtractedItem[] {
    return result.words;
  }

  async createCardData(
    request: CardCreationRequest,
    progressCallback: (progress: number, step: string) => void
  ): Promise<CardCreationResult> {
    const word = request.item as Word;

    try {
      progressCallback(10, 'Detecting word type...');
      const wordType = await this.multiModelService.call<WordTypeResponse>(
        'word_type',
        (model: string) => fetchJson<WordTypeResponse>(
          this.http,
          `/api/word-type?model=${model}`,
          {
            body: { word: word.word },
            method: 'POST',
          }
        )
      );

      let gender: string | undefined;
      if (wordType.type === 'NOUN') {
        progressCallback(30, 'Detecting gender...');
        const genderResponse = await this.multiModelService.call<GenderResponse>(
          'gender',
          (model: string) => fetchJson<GenderResponse>(
            this.http,
            `/api/gender?model=${model}`,
            {
              body: { word: word.word },
              method: 'POST',
            }
          )
        );
        gender = genderResponse.gender;
      }

      progressCallback(50, 'Translating to multiple languages...');
      const translations = await Promise.all(
        languages.map(async (languageCode) => {
          const translation = await this.multiModelService.call<TranslationResponse>(
            `translation_${languageCode}`,
            (model: string) => fetchJson<TranslationResponse>(
              this.http,
              `/api/translate/${languageCode}?model=${model}`,
              {
                body: word,
                method: 'POST',
              }
            )
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
