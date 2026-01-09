import { Component, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AsyncPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { fetchJson } from '../../utils/fetchJson';
import { CompressQueryPipe } from '../../utils/compress-query.pipe';
import { AudioData } from '../types/audio-generation.types';
import { VoiceSelectionDialogComponent, LanguageTexts } from '../voice-selection-dialog/voice-selection-dialog.component';
import { CardResourceLike } from '../types/card-resource.types';

@Component({
  selector: 'app-card-actions',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    RouterModule,
    AsyncPipe,
    CompressQueryPipe,
  ],
  templateUrl: './card-actions.component.html',
  styleUrl: './card-actions.component.css',
})
export class CardActionsComponent {
  card = input<CardResourceLike>();
  languageTexts = input<LanguageTexts[]>([]);
  markedForReview = output<void>();
  cardProcessed = output<void>();

  private readonly http = inject(HttpClient);
  private readonly dialog = inject(MatDialog);

  async markForReview(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    const cardId = this.card()?.value()?.id;
    if (!cardId) return;

    try {
      await fetchJson(this.http, `/api/card/${cardId}`, {
        body: { readiness: 'IN_REVIEW' },
        method: 'PUT',
      });
      this.card()?.reload?.();
      this.cardProcessed.emit();
    } catch (error) {
      console.error('Error marking card for review:', error);
    }
  }

  async openVoiceSelection(event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    const card = this.card()?.value();
    if (!card) return;

    // Use provided language texts
    const languageTexts = this.languageTexts();
    if (languageTexts.length === 0) {
      console.warn('No language texts provided for voice selection');
      return;
    }

    const dialogRef = this.dialog.open(VoiceSelectionDialogComponent, {
      width: 'auto',
      maxWidth: '90vw',
      maxHeight: '90vh',
      panelClass: 'voice-selection-dialog',
      data: {
        audioData: card.data?.audio || [],
        languageTexts: languageTexts
      }
    });

    dialogRef.afterClosed().subscribe(async (updatedAudio: AudioData[] | undefined) => {
      if (updatedAudio) {
        await this.updateCardAudio(updatedAudio);
      }
    });
  }

  private async updateCardAudio(audio: AudioData[]) {
    const card = this.card()?.value();
    if (!card) {
      return;
    }

    const sanitizedAudio = audio.map((entry) => ({
      ...entry,
      selected: Boolean(entry.selected),
    }));

    try {
      await fetchJson(this.http, `/api/card/${card.id}`, {
        method: 'PUT',
        body: {
          data: {
            ...card.data,
            audio: sanitizedAudio,
          },
        },
      });
      this.card()?.reload?.();
      this.cardProcessed.emit();
    } catch (error) {
      console.error('Error saving voice selection:', error);
    }
  }
}
