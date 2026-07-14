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
import { CardReadiness } from '../shared/state/card-readiness';

@Injectable({
  providedIn: 'root',
})
export class SimpleCardType implements CardTypeStrategy {
  readonly cardType: CardType = 'simple';
  readonly completionReadiness: CardReadiness = 'READY';

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
      category?: string;
    };
    return {
      frontText: simple.frontText,
      backText: simple.backText,
      ...(simple.topic ? { topic: simple.topic } : {}),
      ...(simple.category ? { category: simple.category } : {}),
    };
  }

  async createCardData(
    cardData: CardData,
    _progressCallback: (progress: number, step: string) => void,
    onToolsRequested: () => void
  ): Promise<CardData> {
    onToolsRequested();
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
    const info = [card.data.category, card.data.topic]
      .filter(Boolean)
      .join(' · ');
    return info || undefined;
  }

  getAudioItems(_card: Card): AudioGenerationItem[] {
    return [];
  }

  getLanguageTexts(_card: Card): LanguageTexts[] {
    return [];
  }
}
