import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { resource } from '@angular/core';
import { Card } from '../types';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';
import { InReviewCardsService } from '../../in-review-cards.service';
import { fetchJson } from '../../utils/fetchJson';
import { mapCardDatesFromISOStrings } from '../../utils/date-mapping.util';
import { EditVocabularyCardComponent } from './edit-vocabulary-card/edit-vocabulary-card.component';
import { EditSpeechCardComponent } from './edit-speech-card/edit-speech-card.component';
import { EditGrammarCardComponent } from './edit-grammar-card/edit-grammar-card.component';
import { CardType } from '../types';
import { CardTypeRegistry } from '../../cardTypes/card-type.registry';

@Component({
  selector: 'app-edit-card',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatIcon,
    RouterModule,
    EditVocabularyCardComponent,
    EditSpeechCardComponent,
    EditGrammarCardComponent,
  ],
  templateUrl: './edit-card.component.html',
  styleUrl: './edit-card.component.css',
})
export class EditCardComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly cardTypeRegistry = inject(CardTypeRegistry);
  readonly inReviewCardsService = inject(InReviewCardsService);
  readonly route = inject(ActivatedRoute);
  readonly dialog = inject(MatDialog);
  readonly snackBar = inject(MatSnackBar);

  readonly selectedSourceId = signal<string | undefined>(undefined);
  readonly selectedPageNumber = signal<number | undefined>(undefined);
  readonly selectedCardId = signal<string | undefined>(undefined);
  readonly markAsReviewedAvailable = signal<boolean>(false);
  readonly pendingCardEdits = signal<any>(undefined);

  readonly card = resource<Card | undefined, { cardId: string | undefined }>({
    params: () => ({ cardId: this.selectedCardId() }),
    loader: async ({ params: { cardId } }) => {
      if (!cardId) {
        return;
      }

      const card = await fetchJson<Card>(this.http, `/api/card/${cardId}`);
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
      this.selectedCardId.set(params['cardId']);
    });
  }

  getCardType(): CardType | undefined {
    return this.card.value()?.source.cardType;
  }

  getCardTypeTitle(): string {
    const card = this.card.value();
    const cardType = card?.source.cardType;
    if (!card || !cardType) {
      return '';
    }
    const strategy = this.cardTypeRegistry.getStrategy(cardType);
    return strategy.getCardTypeLabel(card);
  }

  handleCardUpdate(cardData: any) {
    this.pendingCardEdits.set(cardData);
  }


  private showSnackBar(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      verticalPosition: 'top',
      panelClass: ['success'],
    });
  }

  async saveCard() {
    const cardId = this.selectedCardId();
    const pendingEdits = this.pendingCardEdits();

    if (!cardId || !pendingEdits) {
      return;
    }

    await fetchJson(this.http, `/api/card/${cardId}`, {
      body: pendingEdits,
      method: 'PUT',
    });

    this.pendingCardEdits.set(undefined);
    this.showSnackBar('Card updated successfully');
  }

  async markAsReviewed() {
    const cardId = this.selectedCardId();
    if (!cardId) {
      return;
    }

    const pendingEdits = this.pendingCardEdits();
    const requestBody = pendingEdits
      ? { ...pendingEdits, readiness: 'REVIEWED' }
      : { readiness: 'REVIEWED' };

    await fetchJson(this.http, `/api/card/${cardId}`, {
      body: requestBody,
      method: 'PUT',
    });

    this.pendingCardEdits.set(undefined);
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
        // Navigate back to the appropriate page after deletion
        await this.router.navigate(this.backNavigationUrl());
      }
    });
  }

  private async deleteCard() {
    const cardId = this.selectedCardId();
    if (!cardId) {
      return;
    }

    await fetchJson(this.http, `/api/card/${cardId}`, {
      method: 'DELETE',
    });

    if (this.isInReview()) {
      this.inReviewCardsService.refetchCards();
    }
  }
}
