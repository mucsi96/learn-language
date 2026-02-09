import {
  Component,
  input,
  output,
  signal,
  computed,
  inject,
  effect,
  ElementRef,
  OnDestroy,
  afterNextRender,
  Injector,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Card, CardType } from '../../parser/types';
import { CardTypeRegistry } from '../../cardTypes/card-type.registry';
import { fetchJson } from '../../utils/fetchJson';
import { ConfirmDialogComponent } from '../../parser/edit-card/confirm-dialog/confirm-dialog.component';
import { EditVocabularyCardComponent } from '../../parser/edit-card/edit-vocabulary-card/edit-vocabulary-card.component';
import { EditSpeechCardComponent } from '../../parser/edit-card/edit-speech-card/edit-speech-card.component';
import { EditGrammarCardComponent } from '../../parser/edit-card/edit-grammar-card/edit-grammar-card.component';

@Component({
  selector: 'app-review-card-item',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIcon,
    EditVocabularyCardComponent,
    EditSpeechCardComponent,
    EditGrammarCardComponent,
  ],
  templateUrl: './review-card-item.component.html',
  styleUrl: './review-card-item.component.css',
})
export class ReviewCardItemComponent implements OnDestroy {
  card = input.required<Card>();
  reviewed = output<string>();
  deleted = output<string>();

  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);
  private readonly elementRef = inject(ElementRef);
  private readonly cardTypeRegistry = inject(CardTypeRegistry);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly markAsReviewedAvailable = signal(false);
  readonly pendingCardEdits = signal<any>(undefined);
  readonly isReviewed = signal(false);
  readonly isSaving = signal(false);
  private observer: IntersectionObserver | undefined;
  private wasVisible = false;

  readonly cardType = computed(() => this.card().source.cardType);

  readonly displayLabel = computed(() => {
    const card = this.card();
    const strategy = this.cardTypeRegistry.getStrategy(card.source.cardType);
    return strategy.getCardDisplayLabel(card);
  });

  readonly typeLabel = computed(() => {
    const card = this.card();
    const strategy = this.cardTypeRegistry.getStrategy(card.source.cardType);
    return strategy.getCardTypeLabel(card);
  });

  readonly canMarkAsReviewed = computed(
    () => this.markAsReviewedAvailable() && !this.isReviewed()
  );

  constructor() {
    effect(() => {
      const card = this.card();
      this.isReviewed.set(card.readiness === 'REVIEWED');
    });

    afterNextRender(() => {
      this.setupIntersectionObserver();
    }, { injector: this.injector });
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }

  handleCardUpdate(cardData: any) {
    this.pendingCardEdits.set(cardData);
  }

  async saveCard() {
    const card = this.card();
    const pendingEdits = this.pendingCardEdits();

    if (!pendingEdits) {
      return;
    }

    this.isSaving.set(true);
    try {
      await fetchJson(this.http, `/api/card/${card.id}`, {
        body: pendingEdits,
        method: 'PUT',
      });
      this.pendingCardEdits.set(undefined);
    } finally {
      this.isSaving.set(false);
    }
  }

  async markAsReviewed() {
    const card = this.card();

    this.isSaving.set(true);
    try {
      const pendingEdits = this.pendingCardEdits();
      const requestBody = pendingEdits
        ? { ...pendingEdits, readiness: 'REVIEWED' }
        : { readiness: 'REVIEWED' };

      await fetchJson(this.http, `/api/card/${card.id}`, {
        body: requestBody,
        method: 'PUT',
      });

      this.pendingCardEdits.set(undefined);
      this.isReviewed.set(true);
      this.reviewed.emit(card.id);
      this.snackBar.open('Card marked as reviewed', 'Close', {
        duration: 2000,
        verticalPosition: 'top',
        panelClass: ['success'],
      });
    } finally {
      this.isSaving.set(false);
    }
  }

  async confirmDeleteCard() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '250px',
      data: { message: 'Are you sure you want to delete this card?' },
    });

    const result = await firstValueFrom(dialogRef.afterClosed());
    if (result) {
      await this.deleteCard();
    }
  }

  private async deleteCard() {
    const card = this.card();

    await fetchJson(this.http, `/api/card/${card.id}`, {
      method: 'DELETE',
    });

    this.deleted.emit(card.id);
    this.snackBar.open('Card deleted', 'Close', {
      duration: 2000,
      verticalPosition: 'top',
      panelClass: ['success'],
    });
  }

  private setupIntersectionObserver() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.wasVisible = true;
          } else if (this.wasVisible) {
            this.autoSaveAndReview();
          }
        });
      },
      { threshold: 0.1 }
    );
    this.observer.observe(this.elementRef.nativeElement);
  }

  private async autoSaveAndReview() {
    if (this.isReviewed() || this.isSaving()) {
      return;
    }

    if (this.canMarkAsReviewed()) {
      await this.markAsReviewed();
    } else if (this.pendingCardEdits()) {
      await this.saveCard();
    }
  }
}
