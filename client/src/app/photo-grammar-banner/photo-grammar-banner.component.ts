import { HttpClient } from '@angular/common/http';
import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { CardCandidatesService } from '../card-candidates.service';
import { ExtractedItem } from '../parser/types';
import { PendingPhotoService } from '../pending-photo.service';
import { fetchJson } from '../utils/fetchJson';

type SentenceIdResponse = { id: string; exists: boolean };

const CARD_COUNT_OPTIONS = [5, 10, 15, 20, 30] as const;

@Component({
  selector: 'app-photo-grammar-banner',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressBarModule,
  ],
  templateUrl: './photo-grammar-banner.component.html',
  styleUrl: './photo-grammar-banner.component.css',
})
export class PhotoGrammarBannerComponent {
  private readonly http = inject(HttpClient);
  private readonly pendingPhotoService = inject(PendingPhotoService);
  private readonly candidatesService = inject(CardCandidatesService);

  readonly sourceId = input.required<string>();

  readonly cardCountOptions = CARD_COUNT_OPTIONS;
  readonly cardCount = signal<number>(10);
  readonly isCreating = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly previewUrl = this.pendingPhotoService.previewUrl;

  async createCards(): Promise<void> {
    const count = this.cardCount();
    const sid = this.sourceId();

    if (!count || count < 1) {
      return;
    }

    this.isCreating.set(true);
    this.errorMessage.set(null);

    try {
      const { sentences, model } = await this.pendingPhotoService.consume(sid, count);

      const items = await Promise.all(
        sentences.map(async ({ sentence, hint }): Promise<ExtractedItem & { sentence: string; hint?: string }> => {
          const idResp = await fetchJson<SentenceIdResponse>(
            this.http,
            '/api/sentence-id',
            { body: { germanSentence: sentence }, method: 'POST' }
          );
          return {
            id: idResp.id,
            exists: idResp.exists,
            extractionModel: model,
            sentence,
            ...(hint ? { hint } : {}),
          };
        })
      );

      this.candidatesService.setExternalItems(items);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create cards';
      this.errorMessage.set(message);
    } finally {
      this.isCreating.set(false);
    }
  }

  async discard(): Promise<void> {
    this.errorMessage.set(null);
    try {
      await this.pendingPhotoService.discard(this.sourceId());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to discard photo';
      this.errorMessage.set(message);
    }
  }
}
