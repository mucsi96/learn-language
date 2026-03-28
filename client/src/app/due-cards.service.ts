import { inject, Injectable, resource } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from './utils/fetchJson';
import { CardState } from './shared/state/card-state';
import { DataRefreshService } from './data-refresh.service';

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
  private readonly dataRefreshService = inject(DataRefreshService);

  readonly dueCounts = resource({
    params: () => ({ _refresh: this.dataRefreshService.refreshTrigger() }),
    loader: async () => fetchJson<SourceDueCardCount[]>(this.http, '/api/sources/due-cards-count'),
  });

  refetchDueCounts() {
    this.dueCounts.reload();
  }
}
