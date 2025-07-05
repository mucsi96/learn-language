import { HttpClient } from '@angular/common/http';
import { Injectable, inject, resource } from '@angular/core';
import { fetchJson } from './utils/fetchJson';
import { Card } from './parser/types';

@Injectable({
  providedIn: 'root',
})
export class MostDueCardService {
  private readonly http = inject(HttpClient);

  getMostDueCard = (sourceId: string) =>
    resource({
      loader: async () => {
        if (!sourceId) return;
        return fetchJson<Card>(
          this.http,
          `/api/source/${sourceId}/most-due-card`
        );
      },
    });
}
