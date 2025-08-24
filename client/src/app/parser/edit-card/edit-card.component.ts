import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { resource } from '@angular/core';
import { injectQueryParams } from '../../utils/inject-query-params';
import { queryParamToObject } from '../../utils/queryCompression';
import { Word, Card } from '../types';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';
import { InReviewCardsService } from '../../in-review-cards.service';
import { fetchJson } from '../../utils/fetchJson';
import { mapCardDatesFromISOStrings } from '../../utils/date-mapping.util';
import { EditVocabularyCardComponent } from './edit-vocabulary-card/edit-vocabulary-card.component';

@Component({
  selector: 'app-edit-card',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatIcon,
    RouterModule,
    EditVocabularyCardComponent,
  ],
  templateUrl: './edit-card.component.html',
  styleUrl: './edit-card.component.css',
})
export class EditCardComponent {
  private readonly http = inject(HttpClient);
  readonly inReviewCardsService = inject(InReviewCardsService);
  readonly route = inject(ActivatedRoute);
  readonly dialog = inject(MatDialog);
  readonly snackBar = inject(MatSnackBar);
  
  readonly cardData = injectQueryParams<string>('cardData');
  readonly selectedSourceId = signal<string | undefined>(undefined);
  readonly selectedPageNumber = signal<number | undefined>(undefined);
  readonly selectedWord = signal<Word | undefined>(undefined);
  readonly markAsReviewedAvailable = signal<boolean>(false);

  readonly card = resource<Card | undefined, { selectedWord: Word | undefined }>({
    params: () => ({ selectedWord: this.selectedWord() }),
    loader: async ({ params: { selectedWord } }) => {
      if (!selectedWord || !selectedWord.exists) {
        return;
      }

      const card = await fetchJson<Card>(this.http, `/api/card/${selectedWord.id}`);
      return mapCardDatesFromISOStrings(card);
    },
  });

  readonly isLoading = computed(() => this.card.isLoading());

  readonly backNavigationUrl = computed(() => {
    const card = this.card.value();
    const readiness = card?.readiness;
    const sourceId = this.selectedSourceId();
    const pageNumber = this.selectedPageNumber();

    if (readiness === 'IN_REVIEW' || readiness === 'REVIEWED') {
      return ['/in-review-cards'];
    }

    return ['/sources', sourceId, 'page', pageNumber];
  });

  readonly isInReview = computed(() => {
    const card = this.card.value();
    return card?.readiness === 'IN_REVIEW';
  });

  readonly canMarkAsReviewed = computed(() => {
    return this.isInReview() && this.markAsReviewedAvailable();
  });

  constructor() {
    this.route.params.subscribe((params) => {
      this.selectedSourceId.set(params['sourceId']);
      this.selectedPageNumber.set(parseInt(params['pageNumber']));
    });

    this.route.queryParams.subscribe(async (params) => {
      const cardData = params['cardData'];
      if (typeof cardData === 'string') {
        const word = await queryParamToObject<Word>(cardData);
        this.selectedWord.set(word);
      }
    });
  }

  getCardType(): string {
    // For now, we only have vocabulary cards, but this can be extended
    return 'vocabulary';
  }

  getCardTypeTitle(): string {
    return 'Word';
  }

  handleCardUpdate(cardData: any) {
    this.updateCardWithData(cardData);
  }


  private showSnackBar(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      verticalPosition: 'top',
      panelClass: ['success'],
    });
  }

  async updateCard() {
    // This will be called by child components through handleCardUpdate
    this.showSnackBar('Card updated successfully');
  }

  private async updateCardWithData(cardData: any) {
    const word = this.selectedWord();
    if (!word) {
      return;
    }

    await fetchJson(this.http, `/api/card/${word.id}`, {
      body: cardData,
      method: 'PUT',
    });
  }

  async markAsReviewed() {
    const word = this.selectedWord();
    if (!word) {
      return;
    }

    await fetchJson(this.http, `/api/card/${word.id}`, {
      body: { readiness: 'REVIEWED' },
      method: 'PUT',
    });
    
    this.card.reload();
    this.inReviewCardsService.refetchCards();
    this.showSnackBar('Card marked as reviewed successfully');
  }

  async confirmDeleteCard() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '250px',
      data: { message: 'Are you sure you want to delete this card?' },
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        await this.deleteCard();
        this.showSnackBar('Card deleted successfully');
      }
    });
  }

  private async deleteCard() {
    const word = this.selectedWord();
    if (!word) {
      return;
    }

    await fetchJson(this.http, `/api/card/${word.id}`, {
      method: 'DELETE',
    });
  }
}