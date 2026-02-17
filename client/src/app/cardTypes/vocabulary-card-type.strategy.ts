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
  LanguageTexts,
} from '../parser/types';
import { LANGUAGE_CODES } from '../shared/types/audio-generation.types';
import { nonNullable } from '../utils/type-guards';
import { getWordTypeInfo } from '../shared/word-type-translations';
import { getGenderInfo } from '../shared/gender-translations';

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
  warning: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class VocabularyCardType implements CardTypeStrategy {
  readonly cardType: CardType = 'vocabulary';

  private readonly http = inject(HttpClient);
  private readonly multiModelService = inject(MultiModelService);

  async extractItems(request: ExtractionRequest): Promise<ExtractedItem[]> {
    const { sourceId, regions } = request;

    const extractionResult = await this.multiModelService.callWithModel<WordList>(
      'extraction',
      (model: string, headers?: Record<string, string>) =>
        fetchJson<WordList>(
          this.http,
          `/api/source/${sourceId}/extract/words`,
          {
            body: { regions, model },
            method: 'POST',
            headers,
          }
        )
    );

    const wordsWithIds = await Promise.all(
      extractionResult.response.words.map(async (word) => {
        const hungarianTranslation = await this.multiModelService.call<TranslationResponse>(
          'translation',
          (model: string, headers?: Record<string, string>) => fetchJson<TranslationResponse>(
            this.http,
            `/api/translate/hu?model=${model}`,
            {
              body: word,
              method: 'POST',
              headers,
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
          exists: wordIdResponse.exists,
          warning: wordIdResponse.warning,
          extractionModel: extractionResult.model,
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
      const wordTypeResult = await this.multiModelService.callWithModel<WordTypeResponse>(
        'classification',
        (model: string, headers?: Record<string, string>) => fetchJson<WordTypeResponse>(
          this.http,
          `/api/word-type?model=${model}`,
          {
            body: { word: word.word },
            method: 'POST',
            headers,
          }
        )
      );
      const classificationModel = wordTypeResult.model;

      let gender: string | undefined;
      if (wordTypeResult.response.type === 'NOUN') {
        progressCallback(30, 'Detecting gender...');
        const genderResponse = await this.multiModelService.call<GenderResponse>(
          'classification',
          (model: string, headers?: Record<string, string>) => fetchJson<GenderResponse>(
            this.http,
            `/api/gender?model=${model}`,
            {
              body: { word: word.word },
              method: 'POST',
              headers,
            }
          )
        );
        gender = genderResponse.gender;
      }

      progressCallback(50, 'Translating to multiple languages...');
      const translationResults = await Promise.all(
        languages.map(async (languageCode) => {
          const result = await this.multiModelService.callWithModel<TranslationResponse>(
            'translation',
            (model: string, headers?: Record<string, string>) => fetchJson<TranslationResponse>(
              this.http,
              `/api/translate/${languageCode}?model=${model}`,
              {
                body: word,
                method: 'POST',
                headers,
              }
            )
          );
          return { languageCode, translation: result.response, model: result.model };
        })
      );

      const translationModel = translationResults[0]?.model;
      const translationMap = Object.fromEntries(
        translationResults.map(({ languageCode, translation }) => [
          languageCode,
          translation.translation
        ])
      );
      const exampleTranslations = Object.fromEntries(
        translationResults.map(({ languageCode, translation }) => [
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
        type: wordTypeResult.response.type,
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
        })),
        translationModel,
        classificationModel,
        extractionModel: word.extractionModel,
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

  getCardTypeLabel(card: Card): string {
    const type = card.data.type;
    return type ? (getWordTypeInfo(type)?.translation ?? '-') : '-';
  }

  getCardAdditionalInfo(card: Card): string | undefined {
    const gender = card.data.gender;
    const genderInfo = gender ? getGenderInfo(gender) : undefined;
    return genderInfo?.translation;
  }

  getAudioItems(card: Card): AudioGenerationItem[] {
    const selectedExample = card.data.examples?.find(example => example.isSelected);

    return [
      card.data.word ? { text: card.data.word, language: LANGUAGE_CODES.GERMAN, context: selectedExample?.['de'], singleWord: true } : null,
      card.data.translation?.['hu'] ? { text: card.data.translation['hu'], language: LANGUAGE_CODES.HUNGARIAN, context: selectedExample?.['hu'], singleWord: true } : null,
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

  getLanguageTexts(card: Card): LanguageTexts[] {
    const selectedExample = card.data.examples?.find(ex => ex.isSelected);

    const germanTexts = [
      card.data.word,
      selectedExample?.['de']
    ].filter(nonNullable);

    const hungarianTexts = [
      card.data.translation?.['hu'],
      selectedExample?.['hu']
    ].filter(nonNullable);

    return [
      ...(germanTexts.length > 0 ? [{ language: 'de', texts: germanTexts }] : []),
      ...(hungarianTexts.length > 0 ? [{ language: 'hu', texts: hungarianTexts }] : [])
    ];
  }
}
