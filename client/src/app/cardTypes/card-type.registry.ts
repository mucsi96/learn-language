import { Injectable, inject } from '@angular/core';
import { VocabularyCardType } from './vocabulary-card-type.strategy';
import { SpeechCardType } from './speech-card-type.strategy';
import { GrammarCardType } from './grammar-card-type.strategy';
import { CardTypeStrategy, CardType } from '../parser/types';

@Injectable({
  providedIn: 'root',
})
export class CardTypeRegistry {
  private readonly vocabularyStrategy = inject(VocabularyCardType);
  private readonly speechStrategy = inject(SpeechCardType);
  private readonly grammarStrategy = inject(GrammarCardType);

  getStrategy(cardType: CardType | undefined): CardTypeStrategy {
    switch (cardType) {
      case 'vocabulary':
        return this.vocabularyStrategy;
      case 'speech':
        return this.speechStrategy;
      case 'grammar':
        return this.grammarStrategy;
      default:
        throw new Error(`Unknown card type: ${cardType}. Please configure a valid card type.`);
    }
  }
}
