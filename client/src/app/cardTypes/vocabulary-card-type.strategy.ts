import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from '../utils/fetchJson';
import { languages } from '../shared/constants/languages';
import { MultiModelService } from '../multi-model.service';
import {
  CardTypeStrategy,
  CardCreationRequest,
  CardCreationResult,
  CardType,
  ImageGenerationInfo,
  ExtractionRequest,
  ExtractedItem,
  WordList,
  AudioGenerationItem,
  Card,
  CardData,
  ImagesByIndex,
} from '../parser/types';
import { LANGUAGE_CODES } from '../shared/types/audio-generation.types';
import { nonNullable } from '../utils/type-guards';

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

interface WordIdResponse {
  id: string;
  exists: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class VocabularyCardType implements CardTypeStrategy {
  readonly cardType: CardType = 'vocabulary';

  private readonly http = inject(HttpClient);
  private readonly multiModelService = inject(MultiModelService);

  async extractItems(request: ExtractionRequest): Promise<ExtractedItem[]> {
    const { sourceId, pageNumber, x, y, width, height } = request;

    const wordList = await this.multiModelService.call<WordList>(
      'word_extraction',
      (model: string) =>
        fetchJson<WordList>(
          this.http,
          `/api/source/${sourceId}/page/${pageNumber}/words?x=${x}&y=${y}&width=${width}&height=${height}&model=${model}`
        )
    );

    const wordsWithIds = await Promise.all(
      wordList.words.map(async (word) => {
        const hungarianTranslation = await this.multiModelService.call<TranslationResponse>(
          'translation_hu',
          (model: string) => fetchJson<TranslationResponse>(
            this.http,
            `/api/translate/hu?model=${model}`,
            {
              body: word,
              method: 'POST',
            }
          )
        );

        const wordIdResponse = await fetchJson<WordIdResponse>(
          this.http,
          '/api/word-id',
          {
            body: {
              germanWord: word.word,
              hungarianTranslation: hungarianTranslation.translation
            },
            method: 'POST',
          }
        );

        return {
          ...word,
          id: wordIdResponse.id,
          exists: wordIdResponse.exists
        };
      })
    );

    return wordsWithIds;
  }

  getItemLabel(item: ExtractedItem & { word: string }): string {
    return item.word;
  }

  filterItemsBySearchTerm(items: (ExtractedItem & { word: string })[], searchTerm: string): ExtractedItem[] {
    const lowerSearchTerm = searchTerm.toLowerCase();
    return items.filter(item =>
      item.word.toLowerCase().includes(lowerSearchTerm)
    );
  }

  async createCardData(
    request: CardCreationRequest,
    progressCallback: (progress: number, step: string) => void
  ): Promise<CardCreationResult> {
    const word = request.item as ExtractedItem & { word: string; forms: string[]; examples: string[] };

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

  requiredAudioLanguages(): string[] {
    return [LANGUAGE_CODES.GERMAN, LANGUAGE_CODES.HUNGARIAN];
  }

  getCardDisplayLabel(card: Card): string {
    return card.data.word || card.id;
  }

  getAudioItems(card: Card): AudioGenerationItem[] {
    const selectedExample = card.data.examples?.find(example => example.isSelected);

    return [
      card.data.word ? { text: card.data.word, language: LANGUAGE_CODES.GERMAN } : null,
      card.data.translation?.['hu'] ? { text: card.data.translation['hu'], language: LANGUAGE_CODES.HUNGARIAN } : null,
      selectedExample?.['de'] ? { text: selectedExample['de'], language: LANGUAGE_CODES.GERMAN } : null,
      selectedExample?.['hu'] ? { text: selectedExample['hu'], language: LANGUAGE_CODES.HUNGARIAN } : null,
    ].filter(nonNullable);
  }

  updateCardDataWithImages(cardData: CardData, images: ImagesByIndex): CardData {
    if (!cardData.examples) {
      return cardData;
    }

    const updatedExamples = cardData.examples.map((example, idx) => {
      const existingImages = example.images ?? [];
      const newImages = images.get(idx) ?? [];
      return {
        ...example,
        images: [...existingImages, ...newImages]
      } as typeof example;
    });

    return { ...cardData, examples: updatedExamples };
  }
}
