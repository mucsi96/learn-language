import { Component, inject, input, output, ResourceRef } from '@angular/core';
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
import { VoiceSelectionDialogComponent } from '../voice-selection-dialog/voice-selection-dialog.component';

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
  card = input<ResourceRef<any>>();
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
      this.card()?.reload();
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

    const dialogRef = this.dialog.open(VoiceSelectionDialogComponent, {
      width: 'auto',
      maxWidth: '90vw',
      maxHeight: '90vh',
      panelClass: 'voice-selection-dialog',
      data: {
        cardAudio: card.data?.audio || [],
        cardData: card.data
      }
    });

    dialogRef.afterClosed().subscribe(async (updatedAudio: AudioData[] | undefined) => {
      if (updatedAudio) {
        await this.updateCardAudio(updatedAudio);
      }
    });
  }

  private getCardTexts(cardData: any): string[] {
    const texts: string[] = [];

    if (cardData.data?.word) {
      texts.push(cardData.data.word);
    }

    if (cardData.data?.translation?.hu) {
      texts.push(cardData.data.translation.hu);
    }

    const selectedExample = cardData.data?.examples?.find((ex: any) => ex.isSelected);
    if (selectedExample?.de) {
      texts.push(selectedExample.de);
    }
    if (selectedExample?.hu) {
      texts.push(selectedExample.hu);
    }

    return texts.filter(Boolean);
  }

  private getLanguageTexts(cardData: any): Record<string, string[]> {
    const languageTexts: Record<string, Set<string>> = {};

    const addText = (language: string, value?: string) => {
      if (!value) {
        return;
      }
      const bucket = languageTexts[language] ?? new Set<string>();
      bucket.add(value);
      languageTexts[language] = bucket;
    };

    addText('de', cardData?.word);
    addText('hu', cardData?.translation?.hu);

    const selectedExample = cardData?.examples?.find((example: any) => example.isSelected);
    addText('de', selectedExample?.de);
    addText('hu', selectedExample?.hu);

    const audioEntries: AudioData[] = cardData?.audio ?? [];
    audioEntries.forEach((audio) => {
      if (audio.language && audio.text) {
        addText(audio.language, audio.text);
      }
    });

    return Object.fromEntries(
      Object.entries(languageTexts).map(([language, values]) => [language, Array.from(values)])
    );
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
      this.card()?.reload();
      this.cardProcessed.emit();
    } catch (error) {
      console.error('Error saving voice selection:', error);
    }
  }
}
