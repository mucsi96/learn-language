import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from '../utils/fetchJson';
import { MultiModelService } from '../multi-model.service';
import {
  CardTypeStrategy,
  CardCreationRequest,
  CardCreationResult,
  CardType,
  ImageGenerationInfo,
  ExtractionRequest,
  ExtractedItem,
  SentenceList,
  Sentence,
  AudioGenerationItem,
  Card,
  CardData,
  ImagesByIndex,
  LanguageTexts,
} from '../parser/types';
import { LANGUAGE_CODES } from '../shared/types/audio-generation.types';
import { nonNullable } from '../utils/type-guards';

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

  async extractItems(request: ExtractionRequest): Promise<ExtractedItem[]> {
    const { sourceId, pageNumber, x, y, width, height } = request;

    const sentenceList = await this.multiModelService.call<SentenceList>(
      'extraction',
      (model: string) =>
        fetchJson<SentenceList>(
          this.http,
          `/api/source/${sourceId}/page/${pageNumber}/sentences?x=${x}&y=${y}&width=${width}&height=${height}&model=${model}`
        )
    );

    const sentencesWithIds = await Promise.all(
      sentenceList.sentences.map(async (item) => {
        const sentenceIdResponse = await fetchJson<SentenceIdResponse>(
          this.http,
          '/api/sentence-id',
          {
            body: { germanSentence: item.sentence },
            method: 'POST',
          }
        );

        return {
          ...item,
          id: sentenceIdResponse.id,
          exists: sentenceIdResponse.exists,
        };
      })
    );

    return sentencesWithIds;
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

  async createCardData(
    request: CardCreationRequest,
    progressCallback: (progress: number, step: string) => void
  ): Promise<CardCreationResult> {
    const sentence = request.item as ExtractedItem & { sentence: string };

    try {
      progressCallback(20, 'Translating to Hungarian...');
      const hungarianTranslation =
        await this.multiModelService.call<SentenceTranslationResponse>(
          'translation',
          (model: string) =>
            fetchJson<SentenceTranslationResponse>(
              this.http,
              `/api/translate-sentence/hu?model=${model}`,
              {
                body: { sentence: sentence.sentence },
                method: 'POST',
              }
            )
        );

      progressCallback(50, 'Translating to English...');
      const englishTranslation =
        await this.multiModelService.call<SentenceTranslationResponse>(
          'translation',
          (model: string) =>
            fetchJson<SentenceTranslationResponse>(
              this.http,
              `/api/translate-sentence/en?model=${model}`,
              {
                body: { sentence: sentence.sentence },
                method: 'POST',
              }
            )
        );

      progressCallback(80, 'Preparing speech card data...');

      const imageGenerationInfos: ImageGenerationInfo[] = englishTranslation.translation
        ? [
            {
              cardId: sentence.id,
              exampleIndex: 0,
              englishTranslation: englishTranslation.translation,
            },
          ]
        : [];

      const cardData: CardData = {
        sentence: sentence.sentence,
        translation: {
          hu: hungarianTranslation.translation,
          en: englishTranslation.translation,
        },
        examples: [
          {
            de: sentence.sentence,
            hu: hungarianTranslation.translation,
            en: englishTranslation.translation,
            isSelected: true,
            images: [],
          },
        ],
      };

      return { cardData, imageGenerationInfos };
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
    return card.data.sentence || card.id;
  }

  getCardTypeLabel(_card: Card): string {
    return 'Sentence';
  }

  getCardAdditionalInfo(_card: Card): string | undefined {
    return undefined;
  }

  getAudioItems(card: Card): AudioGenerationItem[] {
    return [
      card.data.sentence
        ? { text: card.data.sentence, language: LANGUAGE_CODES.GERMAN }
        : null,
      card.data.translation?.['hu']
        ? { text: card.data.translation['hu'], language: LANGUAGE_CODES.HUNGARIAN }
        : null,
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
        images: [...existingImages, ...newImages],
      } as typeof example;
    });

    return { ...cardData, examples: updatedExamples };
  }

  getLanguageTexts(card: Card): LanguageTexts[] {
    const germanTexts = [card.data.sentence].filter(nonNullable);

    const hungarianTexts = [card.data.translation?.['hu']].filter(nonNullable);

    return [
      ...(germanTexts.length > 0 ? [{ language: 'de', texts: germanTexts }] : []),
      ...(hungarianTexts.length > 0
        ? [{ language: 'hu', texts: hungarianTexts }]
        : []),
    ];
  }
}
