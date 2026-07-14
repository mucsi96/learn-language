import {
  Component,
  input,
  output,
  computed,
  linkedSignal,
  effect,
} from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { MatFormFieldModule, MatLabel } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Card, CardData } from '../../types';
import { MarkdownPipe } from '../../../shared/markdown.pipe';

@Component({
  selector: 'app-edit-simple-card',
  imports: [
    FormField,
    MatFormFieldModule,
    MatLabel,
    MatInputModule,
    MarkdownPipe,
  ],
  templateUrl: './edit-simple-card.component.html',
  styleUrl: './edit-simple-card.component.css',
})
export class EditSimpleCardComponent {
  selectedCardId = input<string | undefined>();
  selectedSourceId = input<string | undefined>();
  selectedPageNumber = input<number | undefined>();
  card = input<Card | undefined>();
  cardUpdate = output<Partial<Card>>();
  saveRequested = output<void>();
  markAsReviewedAvailable = output<boolean>();

  readonly formModel = linkedSignal(() => ({
    frontText: this.card()?.data.frontText ?? '',
    backText: this.card()?.data.backText ?? '',
    category: this.card()?.data.category ?? '',
  }));
  readonly simpleForm = form(this.formModel);

  readonly canMarkAsReviewed = computed(() => {
    if (this.card()?.readiness !== 'IN_REVIEW') {
      return false;
    }

    const { frontText, backText } = this.formModel();
    return frontText.trim().length > 0 && backText.trim().length > 0;
  });

  constructor() {
    effect(() => {
      const cardData = this.getCardData();
      if (cardData) {
        this.cardUpdate.emit(cardData);
      }
    });

    effect(() => {
      this.markAsReviewedAvailable.emit(this.canMarkAsReviewed());
    });
  }

  private getCardData():
    | Omit<
        Card,
        | 'due'
        | 'stability'
        | 'readiness'
        | 'difficulty'
        | 'elapsedDays'
        | 'scheduledDays'
        | 'learningSteps'
        | 'reps'
        | 'lapses'
        | 'state'
      >
    | undefined {
    const sourceId = this.selectedSourceId();
    const pageNumber = this.selectedPageNumber();
    const cardId = this.selectedCardId();
    const { frontText, backText, category } = this.formModel();

    if (!cardId || !frontText || !backText || !sourceId || !pageNumber) {
      return;
    }

    const trimmedCategory = category.trim();
    const data: CardData = {
      frontText,
      backText,
      ...(trimmedCategory ? { category: trimmedCategory } : {}),
    };

    return {
      id: cardId,
      source: { id: sourceId },
      sourcePageNumber: pageNumber,
      data,
    };
  }
}
