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

    const cardData = this.card()?.value();
    if (!cardData) return;

    const cardTexts = this.getCardTexts(cardData);
    const cardAudio = cardData.data?.audio || [];

    const dialogRef = this.dialog.open(VoiceSelectionDialogComponent, {
      width: '600px',
    });

    // Set the input values on the component instance
    dialogRef.componentInstance.cardAudio.set(cardAudio as any);
    dialogRef.componentInstance.cardTexts.set(cardTexts);

    const result = await new Promise<any>(resolve => {
      dialogRef.afterClosed().subscribe(resolve);
    });
    
    if (result?.type === 'voice_selected') {
      await this.updateSelectedVoice(result.audioId);
    } else if (result?.type === 'audio_generated') {
      await this.addNewAudio(result.audioData);
    }
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

  private async updateSelectedVoice(audioId: string) {
    const cardId = this.card()?.value()?.id;
    if (!cardId) return;

    try {
      await fetchJson(this.http, `/api/card/${cardId}/audio/${audioId}/select`, {
        method: 'PUT',
      });
      this.card()?.reload();
      this.cardProcessed.emit();
    } catch (error) {
      console.error('Error updating selected voice:', error);
    }
  }

  private async addNewAudio(audioData: any) {
    const cardId = this.card()?.value()?.id;
    if (!cardId) return;

    try {
      await fetchJson(this.http, `/api/card/${cardId}/audio`, {
        method: 'POST',
        body: audioData
      });
      this.card()?.reload();
      this.cardProcessed.emit();
    } catch (error) {
      console.error('Error adding new audio:', error);
    }
  }
}
