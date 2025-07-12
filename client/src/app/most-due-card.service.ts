import { HttpClient } from '@angular/common/http';
import {
  Injectable,
  Injector,
  inject,
  linkedSignal,
  resource,
  signal,
  untracked,
} from '@angular/core';
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
  private readonly injector = inject(Injector);
  readonly selectedSourceId = signal<string | undefined>(undefined);
  readonly card = resource({
    params: () => ({ selectedSourceId: this.selectedSourceId() }),
    loader: async ({ params: { selectedSourceId } }) => {
      if (!selectedSourceId) {
        return;
      }

      return fetchJson<MostDueCard>(
        this.http,
        `/api/source/${selectedSourceId}/most-due-card`
      );
    },
    injector: this.injector,
  });

  setSelectedSourceId(sourceId: string) {
    this.selectedSourceId.set(sourceId);
  }
}
