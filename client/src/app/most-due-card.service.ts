import { HttpClient } from '@angular/common/http';
import { Injectable, Injector, inject, resource, signal } from '@angular/core';
import { fetchJson } from './utils/fetchJson';
import { Card } from './parser/types';
import { mapCardDatesFromISOStrings } from './utils/date-mapping.util';

@Injectable({
  providedIn: 'root',
})
export class MostDueCardService {
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);
  readonly selectedSourceId = signal<string | undefined>(undefined);
  readonly card = resource({
    params: () => ({ selectedSourceId: this.selectedSourceId() }),
    loader: async ({ params: { selectedSourceId } }) => {
      if (!selectedSourceId) {
        return;
      }

      const card = await fetchJson<Card>(
        this.http,
        `/api/source/${selectedSourceId}/most-due-card`
      );
      return card ? mapCardDatesFromISOStrings(card) : null;
    },
    injector: this.injector,
  });

  setSelectedSourceId(sourceId: string) {
    this.selectedSourceId.set(sourceId);
  }
}
