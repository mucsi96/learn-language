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
export class GrammarCardType implements CardTypeStrategy {
  readonly cardType: CardType = 'grammar';

  private readonly http = inject(HttpClient);
  private readonly multiModelService = inject(MultiModelService);

  async extractItems(request: ExtractionRequest): Promise<ExtractedItem[]> {
    const { sourceId, pageNumber, x, y, width, height } = request;

    const sentenceList = await this.multiModelService.call<SentenceList>(
      'extraction',
      (model: string) =>
        fetchJson<SentenceList>(
          this.http,
          `/api/source/${sourceId}/page/${pageNumber}/grammar?x=${x}&y=${y}&width=${width}&height=${height}&model=${model}`
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
    const sentence = request.item as Sentence;

    try {
      progressCallback(30, 'Translating to English...');
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

      progressCallback(80, 'Preparing grammar card data...');

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
        examples: [
          {
            de: sentence.sentence,
            en: englishTranslation.translation,
            isSelected: true,
            images: [],
          },
        ],
      };

      return { cardData, imageGenerationInfos };
    } catch (error) {
      throw new Error(
        `Failed to prepare grammar card data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  requiredAudioLanguages(): string[] {
    return [LANGUAGE_CODES.GERMAN];
  }

  getCardDisplayLabel(card: Card): string {
    return card.data.examples?.[0]?.de ?? card.id;
  }

  getCardTypeLabel(_card: Card): string {
    return 'Grammar';
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
    const example = card.data.examples?.[0];
    const germanTexts = [example?.de].filter(nonNullable);

    return [
      ...(germanTexts.length > 0 ? [{ language: 'de', texts: germanTexts }] : []),
    ];
  }
}
