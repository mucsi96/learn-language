import { Injectable, inject, resource, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from '../utils/fetchJson';
import { DataRefreshService } from '../data-refresh.service';

export interface KnownWordDTO {
  word: string;
  hungarianTranslation: string | null;
}

export interface KnownWordsResponse {
  words: KnownWordDTO[];
  count: number;
}

export interface KnownWordsImportResponse {
  importedCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class KnownWordsService {
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);
  private readonly dataRefreshService = inject(DataRefreshService);

  readonly knownWords = resource({
    injector: this.injector,
    params: () => ({ _refresh: this.dataRefreshService.refreshTrigger() }),
    loader: async () => fetchJson<KnownWordsResponse>(this.http, '/api/known-words'),
  });

  async importWords(text: string): Promise<KnownWordsImportResponse> {
    const result = await fetchJson<KnownWordsImportResponse>(
      this.http,
      '/api/known-words/import',
      {
        method: 'POST',
        body: { text },
      }
    );
    this.refresh();
    return result;
  }

  async addWord(word: string): Promise<void> {
    await this.importWords(word);
  }

  async deleteWord(word: string): Promise<void> {
    await fetchJson(this.http, `/api/known-words/${encodeURIComponent(word)}`, {
      method: 'DELETE',
    });
    this.refresh();
  }

  async deleteAllWords(): Promise<void> {
    await fetchJson(this.http, '/api/known-words', {
      method: 'DELETE',
    });
    this.refresh();
  }

  private refresh(): void {
    this.knownWords.reload();
  }
}
