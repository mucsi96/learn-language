import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CardData } from '../parser/types';
import { fetchJson } from '../utils/fetchJson';
import { 
  CardCreationStrategy, 
  CardCreationRequest, 
  CardType 
} from '../shared/types/card-creation.types';

@Injectable({
  providedIn: 'root',
})
export class GrammarCardCreationStrategy implements CardCreationStrategy {
  readonly cardType: CardType = 'grammar';
  
  private readonly http = inject(HttpClient);

  async createCardData(
    request: CardCreationRequest, 
    progressCallback: (progress: number, step: string) => void
  ): Promise<CardData> {
    const { sentence } = request;

    if (!sentence) {
      throw new Error('Sentence is required for grammar card creation');
    }

    try {
      progressCallback(30, 'Translating sentence to Hungarian...');
      const translationResponse = await fetchJson<{ translation: string }>(
        this.http,
        `/api/translate-sentence`,
        {
          body: sentence,
          method: 'POST',
        }
      );

      progressCallback(100, 'Card data created');

      return {
        cardType: 'grammar',
        sentence,
        maskedIndices: [],
        translation: {
          hu: translationResponse.translation
        },
      };
    } catch (error) {
      console.error('Error creating grammar card:', error);
      throw error;
    }
  }
}
