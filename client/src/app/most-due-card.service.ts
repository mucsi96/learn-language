import { HttpClient } from '@angular/common/http';
import { Injectable, Injector, inject, resource, signal } from '@angular/core';
import { fetchJson } from './utils/fetchJson';
import { CardState } from './shared/state/card-state';

export interface MostDueCard {
  id: string;
  sourcePageNumber: number;
  source: {
    id: string;
    name: string;
    type: string;
  }
  data: {
    word: string;
    type: string;
    gender?: string;
    translation: Record<string, string>;
    forms?: string[];
    examples: Array<{
      de: string;
      hu?: string;
      ch?: string;
      isSelected?: boolean;
      images?: Array<{ id: string; isFavorite?: boolean }>;
    }>;
    audio?: Record<string, string>;
  };
    // FSRS fields
  due: string; // ISO date string
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: CardState;
  lastReview?: string; // ISO date string
}

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

      return (
        (await fetchJson<MostDueCard>(
          this.http,
          `/api/source/${selectedSourceId}/most-due-card`
        )) ?? null
      );
    },
    injector: this.injector,
  });

  setSelectedSourceId(sourceId: string) {
    this.selectedSourceId.set(sourceId);
  }
}
