import { Injectable, inject, resource } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from './utils/fetchJson';
import { Card } from './parser/types';
import { mapCardDatesFromISOStrings } from './utils/date-mapping.util';
import { DataRefreshService } from './data-refresh.service';

@Injectable({
  providedIn: 'root',
})
export class InReviewCardsService {
  private readonly http = inject(HttpClient);
  private readonly dataRefreshService = inject(DataRefreshService);

  readonly cards = resource({
    params: () => ({ _refresh: this.dataRefreshService.refreshTrigger() }),
    loader: async () => {
      const cards = await fetchJson<Card[]>(this.http, '/api/cards/readiness/IN_REVIEW');
      return cards.map(card => mapCardDatesFromISOStrings(card));
    },
  });

  refetchCards() {
    this.cards.reload();
  }
}
