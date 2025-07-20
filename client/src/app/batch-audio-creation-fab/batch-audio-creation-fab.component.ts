import { Component, inject, computed, resource } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { BatchAudioCreationService } from '../batch-audio-creation.service';
import { BatchAudioCreationDialogComponent } from '../batch-audio-creation-dialog/batch-audio-creation-dialog.component';
import { BackendCard } from '../in-review-cards/in-review-cards.component';
import { fetchJson } from '../utils/fetchJson';
import { HttpClient } from '@angular/common/http';

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
  readonly cards = resource<BackendCard[], unknown>({
    loader: async () => {
      return fetchJson<BackendCard[]>(this.http, '/api/cards/readiness/REVIEWED');
    },
  });

  readonly cardsForAudio = computed(() => {
    const cards = this.cards.value();
    if (!cards) return [];

    // Filter cards that need audio generation
    return cards.filter(card => {
      // Check if card has the required data and needs audio
      const hasWord = Boolean(card.data.word);
      const hasHungarianTranslation = Boolean(card.data.translation?.['hu']);
      const hasSelectedExample = Boolean(card.data.examples?.some(ex => ex.isSelected));

      // Check if audio is missing for any of these texts
      const audioMap = (card.data as any).audio || {};
      const needsWordAudio = hasWord && !audioMap[card.data.word];
      const needsTranslationAudio = hasHungarianTranslation && card.data.translation && !audioMap[card.data.translation['hu']];

      let needsExampleAudio = false;
      if (hasSelectedExample && card.data.examples) {
        const selectedExample = card.data.examples.find(ex => ex.isSelected);
        if (selectedExample) {
          const needsDeAudio = selectedExample.de && !audioMap[selectedExample.de];
          const needsHuAudio = selectedExample.hu && !audioMap[selectedExample.hu];
          needsExampleAudio = Boolean(needsDeAudio || needsHuAudio);
        }
      }

      return needsWordAudio || needsTranslationAudio || needsExampleAudio;
    });
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

    const result = await this.batchAudioService.createAudioInBatch(
      cards
    );

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
  }
}
