import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from '../utils/fetchJson';
import { MultiModelService } from '../multi-model.service';
import {
  CardTypeStrategy,
  CardType,
  ExtractionRequest,
  ExtractedItem,
  SentenceList,
  AudioGenerationItem,
  Card,
  CardData,
  LanguageTexts,
} from '../parser/types';
import { LANGUAGE_CODES } from '../shared/types/audio-generation.types';
import { nonNullable } from '../utils/type-guards';
import { ENVIRONMENT_CONFIG } from '../environment/environment.config';
import { generateExampleImages } from '../utils/image-generation.util';

interface SentenceIdResponse {
  id: string;
  exists: boolean;
}

interface SentenceTranslationResponse {
  translation: string;
}

@Injectable({
  providedIn: 'root',
})
export class SpeechCardType implements CardTypeStrategy {
  readonly cardType: CardType = 'speech';

  private readonly http = inject(HttpClient);
  private readonly multiModelService = inject(MultiModelService);
  private readonly environmentConfig = inject(ENVIRONMENT_CONFIG);

  async extractItems(request: ExtractionRequest): Promise<ExtractedItem[]> {
    const { sourceId, regions } = request;

    const extractionResult = await this.multiModelService.callWithModel<SentenceList>(
      'extraction',
      (model: string, headers?: Record<string, string>) =>
        fetchJson<SentenceList>(
          this.http,
          `/api/source/${sourceId}/extract/sentences`,
          {
            body: { regions, model },
            method: 'POST',
            headers,
          }
        )
    );

    return Promise.all(
      extractionResult.response.sentences.map(async (sentence) => {
        const sentenceIdResponse = await fetchJson<SentenceIdResponse>(
          this.http,
          '/api/sentence-id',
          {
            body: { germanSentence: sentence },
            method: 'POST',
          }
        );

        return {
          sentence,
          id: sentenceIdResponse.id,
          exists: sentenceIdResponse.exists,
          extractionModel: extractionResult.model,
        };
      })
    );
  }

  getItemLabel(item: ExtractedItem & { sentence?: string }): string {
    return item.sentence ?? item.id;
  }

  filterItemsBySearchTerm(
    items: (ExtractedItem & { sentence?: string })[],
    searchTerm: string
  ): ExtractedItem[] {
    const lowerSearchTerm = searchTerm.toLowerCase();
    return items.filter((item) =>
      (item.sentence ?? '').toLowerCase().includes(lowerSearchTerm)
    );
  }

  createDraftCardData(item: ExtractedItem): CardData {
    const sentence = item as ExtractedItem & { sentence: string };
    return {
      examples: [{ de: sentence.sentence }],
      extractionModel: sentence.extractionModel,
    };
  }

  async createCardData(
    cardData: CardData,
    progressCallback: (progress: number, step: string) => void
  ): Promise<CardData> {
    const sentence = cardData.examples?.[0]?.de!;

    try {
      progressCallback(15, 'Translating to Hungarian...');
      const hungarianResult =
        await this.multiModelService.callWithModel<SentenceTranslationResponse>(
          'translation',
          (model: string, headers?: Record<string, string>) =>
            fetchJson<SentenceTranslationResponse>(
              this.http,
              `/api/translate-sentence/hu?model=${model}`,
              {
                body: { sentence },
                method: 'POST',
                headers,
              }
            )
        );

      progressCallback(40, 'Translating to English...');
      const englishResult =
        await this.multiModelService.callWithModel<SentenceTranslationResponse>(
          'translation',
          (model: string, headers?: Record<string, string>) =>
            fetchJson<SentenceTranslationResponse>(
              this.http,
              `/api/translate-sentence/en?model=${model}`,
              {
                body: { sentence },
                method: 'POST',
                headers,
              }
            )
        );

      progressCallback(60, 'Generating images...');

      const imageInputs = englishResult.response.translation
        ? [{ exampleIndex: 0, englishTranslation: englishResult.response.translation }]
        : [];

      const imagesMap = await generateExampleImages(
        this.http,
        this.environmentConfig.imageModels,
        imageInputs
      );

      progressCallback(90, 'Preparing speech card data...');

      return {
        examples: [
          {
            de: sentence,
            hu: hungarianResult.response.translation,
            en: englishResult.response.translation,
            isSelected: true,
            images: imagesMap.get(0) ?? [],
          },
        ],
        translationModel: hungarianResult.model,
        extractionModel: cardData.extractionModel,
      };
    } catch (error) {
      throw new Error(
        `Failed to prepare speech card data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  requiredAudioLanguages(): string[] {
    return [LANGUAGE_CODES.GERMAN, LANGUAGE_CODES.HUNGARIAN];
  }

  getCardDisplayLabel(card: Card): string {
    return card.data.examples?.[0]?.de ?? card.id;
  }

  getCardTypeLabel(_card: Card): string {
    return 'Sentence';
  }

  getCardAdditionalInfo(_card: Card): string | undefined {
    return undefined;
  }

  getAudioItems(card: Card): AudioGenerationItem[] {
    const example = card.data.examples?.[0];
    return [
      example?.de
        ? { text: example.de, language: LANGUAGE_CODES.GERMAN }
        : null,
      example?.hu
        ? { text: example.hu, language: LANGUAGE_CODES.HUNGARIAN }
        : null,
    ].filter(nonNullable);
  }

  getLanguageTexts(card: Card): LanguageTexts[] {
    const example = card.data.examples?.[0];
    const germanTexts = [example?.de].filter(nonNullable);
    const hungarianTexts = [example?.hu].filter(nonNullable);

    return [
      ...(germanTexts.length > 0 ? [{ language: 'de', texts: germanTexts }] : []),
      ...(hungarianTexts.length > 0
        ? [{ language: 'hu', texts: hungarianTexts }]
        : []),
    ];
  }
}
