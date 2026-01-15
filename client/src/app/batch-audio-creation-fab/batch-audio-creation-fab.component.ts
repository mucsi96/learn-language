import { Component, inject, computed, resource } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { BatchAudioCreationService } from '../batch-audio-creation.service';
import { BatchAudioCreationDialogComponent } from '../batch-audio-creation-dialog/batch-audio-creation-dialog.component';
import { Card } from '../parser/types';
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
      const result = await this.batchAudioService.createAudioInBatch(cards, 'vocabulary');

      if (result.successfulCards > 0) {
        this.cards.reload();
        this.snackBar.open(
          `Audio generated successfully for ${result.successfulCards} card${result.successfulCards === 1 ? '' : 's'}!`,
          'Close',
          {
            duration: 5000,
            verticalPosition: 'top',
            panelClass: ['success'],
          }
        );
      }

      if (result.failedCards > 0) {
        this.snackBar.open(
          `Failed to generate audio for ${result.failedCards} card${result.failedCards === 1 ? '' : 's'}. Check the console for details.`,
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
}
