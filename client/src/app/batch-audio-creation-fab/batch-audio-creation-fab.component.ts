import { Component, inject, computed, resource } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { BatchAudioCreationService } from '../batch-audio-creation.service';
import { BatchAudioCreationDialogComponent } from '../batch-audio-creation-dialog/batch-audio-creation-dialog.component';
import { Card, CardType, Source } from '../parser/types';
import { fetchJson } from '../utils/fetchJson';
import { HttpClient } from '@angular/common/http';
import { mapCardDatesFromISOStrings } from '../utils/date-mapping.util';

@Component({
  selector: 'app-batch-audio-creation-fab',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatBadgeModule],
  templateUrl: './batch-audio-creation-fab.component.html',
  styleUrl: './batch-audio-creation-fab.component.css',
})
export class BatchAudioCreationFabComponent {
  readonly batchAudioService = inject(BatchAudioCreationService);
  readonly dialog = inject(MatDialog);
  readonly snackBar = inject(MatSnackBar);
  private readonly http = inject(HttpClient);
  readonly cards = resource<Card[], unknown>({
    loader: async () => {
      const cards = await fetchJson<Card[]>(this.http, '/api/cards/missing-audio');
      return cards.map(card => mapCardDatesFromISOStrings(card));
    },
  });

  readonly cardsForAudio = computed(() => {
    const cards = this.cards.value();
    return cards ?? [];
  });

  readonly cardsForAudioCount = computed(() => this.cardsForAudio().length);
  readonly hasCardsForAudioGeneration = computed(() => this.cardsForAudioCount() > 0);

  async startBatchAudioCreation(): Promise<void> {
    const cards = this.cardsForAudio();

    if (cards.length === 0) {
      return;
    }

    this.batchAudioService.clearProgress();

    this.dialog.open(BatchAudioCreationDialogComponent, {
      data: { cards: cards.map(card => ({ id: card.id, data: card.data })) },
      disableClose: true,
      maxWidth: '100vw',
      maxHeight: '100vh',
    });

    try {
      const cardsBySource = this.groupCardsBySource(cards);
      const sourceIds = Object.keys(cardsBySource);
      const sources = await Promise.all(
        sourceIds.map(id => fetchJson<Source>(this.http, `/api/sources/${id}`))
      );
      const sourceCardTypes = new Map(
        sources.map(source => [source.id, source.cardType])
      );

      const results = await sourceIds.reduce<Promise<{ successful: number; failed: number; errors: string[] }>>(
        async (accPromise, sourceId) => {
          const acc = await accPromise;
          const sourceCards = cardsBySource[sourceId];
          const cardType = sourceCardTypes.get(sourceId);
          if (!cardType) {
            return {
              ...acc,
              failed: acc.failed + sourceCards.length,
              errors: [...acc.errors, `Source ${sourceId} has no card type configured`]
            };
          }
          const result = await this.batchAudioService.createAudioInBatch(sourceCards, cardType);
          return {
            successful: acc.successful + result.successfulCards,
            failed: acc.failed + result.failedCards,
            errors: [...acc.errors, ...result.errors]
          };
        },
        Promise.resolve({ successful: 0, failed: 0, errors: [] })
      );

      if (results.successful > 0) {
        this.cards.reload();
        this.snackBar.open(
          `Audio generated successfully for ${results.successful} card${results.successful === 1 ? '' : 's'}!`,
          'Close',
          {
            duration: 5000,
            verticalPosition: 'top',
            panelClass: ['success'],
          }
        );
      }

      if (results.failed > 0) {
        this.snackBar.open(
          `Failed to generate audio for ${results.failed} card${results.failed === 1 ? '' : 's'}. Check the console for details.`,
          'Close',
          {
            duration: 8000,
            verticalPosition: 'top',
            panelClass: ['error'],
          }
        );
      }
    } catch (error) {
      this.snackBar.open(
        `Batch audio creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'Close',
        {
          duration: 8000,
          verticalPosition: 'top',
          panelClass: ['error'],
        }
      );
    }
  }

  private groupCardsBySource(cards: Card[]): Record<string, Card[]> {
    return cards.reduce<Record<string, Card[]>>(
      (acc, card) => ({
        ...acc,
        [card.source.id]: [...(acc[card.source.id] ?? []), card]
      }),
      {}
    );
  }
}
