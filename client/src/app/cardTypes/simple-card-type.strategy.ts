import { Injectable } from '@angular/core';
import {
  CardTypeStrategy,
  CardType,
  ExtractionRequest,
  ExtractedItem,
  AudioGenerationItem,
  BulkCreationContext,
  Card,
  CardData,
  LanguageTexts,
} from '../parser/types';

@Injectable({
  providedIn: 'root',
})
export class SimpleCardType implements CardTypeStrategy {
  readonly cardType: CardType = 'simple';

  async extractItems(_request: ExtractionRequest): Promise<ExtractedItem[]> {
    return [];
  }

  getItemLabel(item: ExtractedItem & { frontText?: string }): string {
    return item.frontText ?? item.id;
  }

  filterItemsBySearchTerm(
    items: (ExtractedItem & { frontText?: string })[],
    searchTerm: string
  ): ExtractedItem[] {
    const lowerSearchTerm = searchTerm.toLowerCase();
    return items.filter((item) =>
      (item.frontText ?? '').toLowerCase().includes(lowerSearchTerm)
    );
  }

  createDraftCardData(item: ExtractedItem, _context?: BulkCreationContext): CardData {
    const simple = item as ExtractedItem & {
      frontText?: string;
      backText?: string;
      topic?: string;
    };
    return {
      frontText: simple.frontText,
      backText: simple.backText,
      ...(simple.topic ? { topic: simple.topic } : {}),
    };
  }

  async createCardData(cardData: CardData): Promise<CardData> {
    return cardData;
  }

  requiredAudioLanguages(): string[] {
    return [];
  }

  getCardDisplayLabel(card: Card): string {
    return card.data.frontText ?? card.id;
  }

  getCardTypeLabel(_card: Card): string {
    return 'Simple';
  }

  getCardAdditionalInfo(card: Card): string | undefined {
    return card.data.topic;
  }

  getAudioItems(_card: Card): AudioGenerationItem[] {
    return [];
  }

  getLanguageTexts(_card: Card): LanguageTexts[] {
    return [];
  }
}
