import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { resource } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { injectParams } from '../../utils/inject-params';
import { Card } from '../types';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';
import { InReviewCardsService } from '../../in-review-cards.service';
import { DueCardsService } from '../../due-cards.service';
import { SourcesService } from '../../sources.service';
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
    EditVocabularyCardComponent,
    EditSpeechCardComponent,
    EditGrammarCardComponent,
  ],
  templateUrl: './edit-card.component.html',
  styleUrl: './edit-card.component.css',
})
export class EditCardComponent {
  private readonly location = inject(Location);
  private readonly http = inject(HttpClient);
  private readonly cardTypeRegistry = inject(CardTypeRegistry);
  private readonly routeSourceId = injectParams('sourceId');
  private readonly routePageNumber = injectParams('pageNumber');
  private readonly routeCardId = injectParams('cardId');
  readonly inReviewCardsService = inject(InReviewCardsService);
  private readonly dueCardsService = inject(DueCardsService);
  private readonly sourcesService = inject(SourcesService);
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

  readonly isInReview = computed(() => {
    const card = this.card.value();
    return card?.readiness === 'IN_REVIEW';
  });

  readonly isFlagged = computed(() => {
    return this.card.value()?.flagged ?? false;
  });

  readonly canMarkAsReviewed = computed(() => {
    return this.isInReview() && this.markAsReviewedAvailable();
  });

  constructor() {
    effect(() => {
      const sourceId = this.routeSourceId();
      const pageNumber = this.routePageNumber();
      const cardId = this.routeCardId();
      if (sourceId) this.selectedSourceId.set(String(sourceId));
      if (pageNumber) this.selectedPageNumber.set(parseInt(String(pageNumber)));
      if (cardId) this.selectedCardId.set(String(cardId));
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

  async removeFlag() {
    const cardId = this.selectedCardId();
    if (!cardId) {
      return;
    }

    try {
      const pendingEdits = this.pendingCardEdits();
      const requestBody = pendingEdits
        ? { ...pendingEdits, flagged: false }
        : { flagged: false };

      await fetchJson(this.http, `/api/card/${cardId}`, {
        body: requestBody,
        method: 'PUT',
      });
      this.pendingCardEdits.set(undefined);
      this.card.reload();
      this.sourcesService.refetchSources();
      this.showSnackBar('Flag removed successfully');
    } catch {
      this.showSnackBar('Failed to remove flag', 'error');
    }
  }

  private showSnackBar(message: string, type: 'success' | 'error' = 'success') {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      verticalPosition: 'top',
      panelClass: [type],
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
    this.dueCardsService.refetchDueCounts();
    this.sourcesService.refetchSources();
    this.showSnackBar('Card marked as reviewed successfully');
  }

  async confirmDeleteCard() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '250px',
      data: { message: 'Are you sure you want to delete this card?' },
    });

    const result = await firstValueFrom(dialogRef.afterClosed());
    if (result) {
      await this.deleteCard();
      this.showSnackBar('Card deleted successfully');
      this.location.back();
    }
  }

  private async deleteCard() {
    const cardId = this.selectedCardId();
    if (!cardId) {
      return;
    }

    await fetchJson(this.http, `/api/card/${cardId}`, {
      method: 'DELETE',
    });

    this.inReviewCardsService.refetchCards();
    this.dueCardsService.refetchDueCounts();
    this.sourcesService.refetchSources();
  }
}
