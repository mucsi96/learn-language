import { Component, inject, computed, signal, OnDestroy } from '@angular/core';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { InReviewCardsService } from '../in-review-cards.service';
import { DueCardsService } from '../due-cards.service';
import { SourcesService } from '../sources.service';
import { ReviewCardItemComponent } from './review-card-item/review-card-item.component';

@Component({
  selector: 'app-in-review-cards',
  standalone: true,
  imports: [
    ScrollingModule,
    MatCardModule,
    MatIconModule,
    ReviewCardItemComponent,
  ],
  templateUrl: './in-review-cards.component.html',
  styleUrl: './in-review-cards.component.css',
})
export class InReviewCardsComponent implements OnDestroy {
  private readonly inReviewCardsService = inject(InReviewCardsService);
  private readonly dueCardsService = inject(DueCardsService);
  private readonly sourcesService = inject(SourcesService);

  readonly cards = this.inReviewCardsService.cards.value;
  readonly loading = computed(
    () => this.inReviewCardsService.cards.isLoading() && !this.cards()
  );

  readonly reviewedCardIds = signal<ReadonlyArray<string>>([]);
  private hasChanges = false;

  readonly totalCount = computed(() => this.cards()?.length ?? 0);

  readonly remainingCount = computed(
    () => this.totalCount() - this.reviewedCardIds().length
  );

  constructor() {
    this.inReviewCardsService.refetchCards();
  }

  ngOnDestroy() {
    if (this.hasChanges) {
      this.dueCardsService.refetchDueCounts();
      this.sourcesService.refetchSources();
    }
  }

  onCardReviewed(cardId: string) {
    this.reviewedCardIds.update((ids) => [...ids, cardId]);
    this.hasChanges = true;
  }

  onCardDeleted(cardId: string) {
    this.inReviewCardsService.refetchCards();
    this.hasChanges = true;
  }
}
