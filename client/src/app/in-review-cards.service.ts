import { Injectable, inject, resource } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from './utils/fetchJson';
import { BackendCard } from './in-review-cards/in-review-cards.component';

@Injectable({
  providedIn: 'root',
})
export class InReviewCardsService {
  private readonly http = inject(HttpClient);

  readonly cards = resource<BackendCard[], unknown>({
    loader: async () => {
      return fetchJson<BackendCard[]>(this.http, '/api/cards/readiness/IN_REVIEW');
    },
  });

  refetchCards() {
    this.cards.reload();
  }
}
