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

  async deleteHighlights(sourceId: string, highlightIds: readonly number[]): Promise<{ deleted: number }> {
    const result = await fetchJson<{ deleted: number }>(
      this.http,
      `/api/source/${sourceId}/highlights`,
      { method: 'DELETE', body: highlightIds }
    );
    this.highlights.reload();
    return result;
  }

  async cleanupWithCards(sourceId: string): Promise<{ deleted: number }> {
    const result = await fetchJson<{ deleted: number }>(
      this.http,
      `/api/source/${sourceId}/highlights/with-cards`,
      { method: 'DELETE' }
    );
    this.highlights.reload();
    return result;
  }
}
