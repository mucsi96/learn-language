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
} from '../parser/types';

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
      'sentence_extraction',
      (model: string) =>
        fetchJson<SentenceList>(
          this.http,
          `/api/source/${sourceId}/page/${pageNumber}/sentences?x=${x}&y=${y}&width=${width}&height=${height}&model=${model}`
        )
    );

    return sentenceList.sentences;
  }

  getItemLabel(item: ExtractedItem): string {
    const sentence = item as Sentence;
    return sentence.sentence;
  }

  filterItemsBySearchTerm(items: ExtractedItem[], searchTerm: string): ExtractedItem[] {
    const lowerSearchTerm = searchTerm.toLowerCase();
    return items.filter(item => {
      const sentence = item as Sentence;
      return sentence.sentence.toLowerCase().includes(lowerSearchTerm);
    });
  }

  async createCardData(
    request: CardCreationRequest,
    progressCallback: (progress: number, step: string) => void
  ): Promise<CardCreationResult> {
    const sentence = request.item as Sentence;

    try {
      progressCallback(30, 'Translating sentence to Hungarian...');
      const translationResponse = await this.multiModelService.call<SentenceTranslationResponse>(
        'sentence_translation_hu',
        (model: string) => fetchJson<SentenceTranslationResponse>(
          this.http,
          `/api/translate-sentence/hu?model=${model}`,
          {
            body: { sentence: sentence.sentence },
            method: 'POST',
          }
        )
      );

      progressCallback(70, 'Preparing speech card data...');

      const imageGenerationInfo: ImageGenerationInfo = {
        cardId: sentence.id,
        exampleIndex: 0,
        englishTranslation: sentence.sentence,
      };

      const cardData = {
        sentence: sentence.sentence,
        translation: {
          hu: translationResponse.translation,
        },
        images: [],
      };

      return { cardData, imageGenerationInfos: [imageGenerationInfo] };

    } catch (error) {
      throw new Error(`Failed to prepare speech card data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
