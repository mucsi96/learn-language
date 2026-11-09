import { inject, Injectable, resource } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from './utils/fetchJson';
import { CardState } from './shared/state/card-state';

export interface SourceDueCardCount {
  sourceId: string;
  state: CardState;
  count: number;
}

@Injectable({
  providedIn: 'root',
})
export class DueCardsService {
  private readonly http = inject(HttpClient);

  readonly dueCounts = resource<SourceDueCardCount[], unknown>({
    loader: async () => {
      return fetchJson(this.http, '/api/sources/due-cards-count');
    },
  });

  refetchDueCounts() {
    this.dueCounts.reload();
  }
}
