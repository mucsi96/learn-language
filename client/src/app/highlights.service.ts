import { inject, Injectable, resource, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Highlight } from './parser/types';
import { fetchJson } from './utils/fetchJson';

@Injectable({
  providedIn: 'root',
})
export class HighlightsService {
  private readonly http = inject(HttpClient);
  private readonly sourceId = signal<string | undefined>(undefined);

  readonly highlights = resource<Highlight[], { sourceId: string | undefined }>({
    params: () => ({ sourceId: this.sourceId() }),
    loader: async ({ params: { sourceId } }) => {
      if (!sourceId) {
        return [];
      }
      return fetchJson<Highlight[]>(this.http, `/api/source/${sourceId}/highlights`);
    },
  });

  setSourceId(sourceId: string) {
    this.sourceId.set(sourceId);
  }

  reload() {
    this.highlights.reload();
  }
}
