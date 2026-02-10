import { Component, inject, computed, signal } from '@angular/core';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { InReviewCardsService } from '../in-review-cards.service';
import { BatchAudioCreationFabComponent } from '../batch-audio-creation-fab/batch-audio-creation-fab.component';
import { ReviewCardItemComponent } from './review-card-item/review-card-item.component';

@Component({
  selector: 'app-in-review-cards',
  standalone: true,
  imports: [
    ScrollingModule,
    MatCardModule,
    MatIconModule,
    ReviewCardItemComponent,
    BatchAudioCreationFabComponent,
  ],
  templateUrl: './in-review-cards.component.html',
  styleUrl: './in-review-cards.component.css',
})
export class InReviewCardsComponent {
  private readonly inReviewCardsService = inject(InReviewCardsService);

  readonly cards = this.inReviewCardsService.cards.value;
  readonly loading = computed(() => this.inReviewCardsService.cards.isLoading());

  readonly reviewedCardIds = signal<ReadonlyArray<string>>([]);

  readonly totalCount = computed(() => this.cards()?.length ?? 0);

  readonly remainingCount = computed(
    () => this.totalCount() - this.reviewedCardIds().length
  );

  onCardReviewed(cardId: string) {
    this.reviewedCardIds.update((ids) => [...ids, cardId]);
  }

  onCardDeleted(cardId: string) {
    this.inReviewCardsService.refetchCards();
  }
}
