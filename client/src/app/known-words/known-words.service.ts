import { Injectable, inject, resource, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from '../utils/fetchJson';

export interface KnownWordsResponse {
  words: string[];
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

  readonly knownWords = resource<KnownWordsResponse, never>({
    injector: this.injector,
    loader: async () => {
      return await fetchJson<KnownWordsResponse>(
        this.http,
        '/api/known-words'
      );
    },
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
