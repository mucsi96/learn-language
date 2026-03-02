import { Component, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { fetchJson } from '../../utils/fetchJson';
import { AudioData } from '../types/audio-generation.types';
import { VoiceSelectionDialogComponent } from '../voice-selection-dialog/voice-selection-dialog.component';
import { LanguageTexts } from '../../parser/types';
import { CardResourceLike } from '../types/card-resource.types';

@Component({
  selector: 'app-card-actions',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    RouterModule,
  ],
  templateUrl: './card-actions.component.html',
  styleUrl: './card-actions.component.css',
})
export class CardActionsComponent {
  card = input<CardResourceLike>();
  languageTexts = input<LanguageTexts[]>([]);
  cardProcessed = output<void>();

  private readonly http = inject(HttpClient);
  private readonly dialog = inject(MatDialog);

  isFlagged(): boolean {
    return this.card()?.value()?.flagged ?? false;
  }

  async toggleFlag(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    const card = this.card()?.value();
    if (!card) return;

    try {
      await fetchJson(this.http, `/api/card/${card.id}`, {
        body: { flagged: !card.flagged },
        method: 'PUT',
      });
      this.card()?.reload?.();
    } catch (error) {
      console.error('Error toggling card flag:', error);
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

    const updatedAudio = await firstValueFrom(dialogRef.afterClosed());
    if (updatedAudio) {
      await this.updateCardAudio(updatedAudio);
    }
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
