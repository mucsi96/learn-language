import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, resource, signal } from '@angular/core';
import { fetchJson } from '../utils/fetchJson';
import {
  WordImportDecision,
  WordImportQueue,
  WordImportStageResult,
  WordImportWord,
} from './word-import.types';

@Injectable({
  providedIn: 'root',
})
export class WordImportService {
  private readonly http = inject(HttpClient);

  private readonly sourceId = signal<string | undefined>(undefined);
  private syncChain: Promise<void> = Promise.resolve();

  readonly pendingSyncCount = signal(0);
  readonly failedSyncCount = signal(0);
  readonly synced = computed(
    () => this.pendingSyncCount() === 0 && this.failedSyncCount() === 0
  );

  readonly queue = resource<WordImportQueue | undefined, { sourceId: string | undefined }>({
    params: () => ({ sourceId: this.sourceId() }),
    loader: async ({ params }) => {
      if (!params.sourceId) {
        return undefined;
      }

      return fetchJson<WordImportQueue>(
        this.http,
        `/api/source/${params.sourceId}/word-import`
      );
    },
  });

  setSource(sourceId: string): void {
    if (this.sourceId() === sourceId) {
      this.queue.reload();
      return;
    }

    this.sourceId.set(sourceId);
  }

  async stageWords(
    sourceId: string,
    words: WordImportWord[]
  ): Promise<WordImportStageResult> {
    const result = await fetchJson<WordImportStageResult>(
      this.http,
      `/api/source/${sourceId}/word-import`,
      { method: 'post', body: { words } }
    );
    this.failedSyncCount.set(0);
    this.queue.reload();
    return result;
  }

  decide(
    sourceId: string,
    candidateId: number,
    decision: WordImportDecision
  ): void {
    this.enqueue(() =>
      fetchJson(
        this.http,
        `/api/source/${sourceId}/word-import/candidates/${candidateId}/${decision}`,
        { method: 'post' }
      )
    );
  }

  undoDecision(sourceId: string, candidateId: number): void {
    this.enqueue(() =>
      fetchJson(
        this.http,
        `/api/source/${sourceId}/word-import/candidates/${candidateId}/undo`,
        { method: 'post' }
      )
    );
  }

  reloadQueue(): void {
    this.failedSyncCount.set(0);
    this.queue.reload();
  }

  async clearQueue(sourceId: string): Promise<void> {
    await this.flush();
    await fetchJson(this.http, `/api/source/${sourceId}/word-import`, {
      method: 'delete',
    });
    this.failedSyncCount.set(0);
    this.queue.reload();
  }

  flush(): Promise<void> {
    return this.syncChain;
  }

  private enqueue(operation: () => Promise<unknown>): void {
    this.pendingSyncCount.update((count) => count + 1);
    this.syncChain = this.syncChain
      .then(operation)
      .then(() => undefined)
      .catch(() => {
        this.failedSyncCount.update((count) => count + 1);
      })
      .finally(() => this.pendingSyncCount.update((count) => count - 1));
  }
}
