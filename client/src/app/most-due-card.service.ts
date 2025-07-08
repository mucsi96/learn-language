import { HttpClient } from '@angular/common/http';
import { Injectable, inject, resource } from '@angular/core';
import { fetchJson } from './utils/fetchJson';
import { State } from 'ts-fsrs';

export interface MostDueCard {
  id: string;
  state: State;
  data: {
    word: string;
    type: string;
    translation: Record<string, string>;
    forms?: string[];
    examples: Array<{
      de: string;
      hu?: string;
      ch?: string;
      isSelected?: boolean;
      images?: Array<{ id: string; isFavorite?: boolean }>;
    }>;
  };
}

@Injectable({
  providedIn: 'root',
})
export class MostDueCardService {
  private readonly http = inject(HttpClient);

  getMostDueCard = (sourceId: string) =>
    resource({
      loader: async () => {
        if (!sourceId) return;
        return fetchJson<MostDueCard>(
          this.http,
          `/api/source/${sourceId}/most-due-card`
        );
      },
    });
}
