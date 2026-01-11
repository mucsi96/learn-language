import { Injectable, inject } from '@angular/core';
import { VocabularyCardCreationStrategy } from './vocabulary-card-creation.strategy';
import { CardCreationStrategy, CardType } from '../shared/types/card-creation.types';

@Injectable({
  providedIn: 'root',
})
export class CardCreationStrategyRegistry {
  private readonly vocabularyStrategy = inject(VocabularyCardCreationStrategy);

  getStrategy(cardType: CardType | undefined): CardCreationStrategy {
    switch (cardType) {
      case 'vocabulary':
        return this.vocabularyStrategy;
      default:
        return this.vocabularyStrategy;
    }
  }
}
