import { Injectable, inject, resource } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from './utils/fetchJson';
import { Card } from './parser/types';
import { mapCardDatesFromISOStrings } from './utils/date-mapping.util';

@Injectable({
  providedIn: 'root',
})
export class InReviewCardsService {
  private readonly http = inject(HttpClient);

  readonly cards = resource<Card[], unknown>({
    loader: async () => {
      const cards = await fetchJson<Card[]>(this.http, '/api/cards/readiness/IN_REVIEW');
      return cards.map(card => mapCardDatesFromISOStrings(card));
    },
  });

  refetchCards() {
    this.cards.reload();
  }
}
