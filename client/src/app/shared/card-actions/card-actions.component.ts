import { Component, inject, input, output, ResourceRef } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AsyncPipe } from '@angular/common';
import { fetchJson } from '../../utils/fetchJson';
import { CompressQueryPipe } from '../../utils/compress-query.pipe';

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
  card =
    input<
      ResourceRef<{
        id: string;
        sourcePageNumber: number;
        source: { id: string };
      } | null | undefined>
    >();
  markedForReview = output<void>();
  cardProcessed = output<void>();

  private readonly http = inject(HttpClient);

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
}
