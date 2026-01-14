import { Injectable, inject } from '@angular/core';
import { VocabularyCardType } from './vocabulary-card-type.strategy';
import { CardTypeStrategy, CardType } from '../parser/types';

@Injectable({
  providedIn: 'root',
})
export class CardTypeRegistry {
  private readonly vocabularyStrategy = inject(VocabularyCardType);

  getStrategy(cardType: CardType | undefined): CardTypeStrategy {
    switch (cardType) {
      case 'vocabulary':
        return this.vocabularyStrategy;
      default:
        throw new Error(`Unknown card type: ${cardType}. Please configure a valid card type.`);
    }
  }
}
