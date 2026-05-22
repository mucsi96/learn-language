import { HttpClient } from '@angular/common/http';
import {
  computed,
  effect,
  inject,
  Injectable,
  resource,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ENVIRONMENT_CONFIG } from './environment/environment.config';
import { SentenceList } from './parser/types';
import { fetchJson } from './utils/fetchJson';
import { uploadDocument } from './utils/uploadDocument';

export type PendingPhotoStatus = {
  hasPending: boolean;
  createdAt?: string;
  expiresAt?: string;
};

const POLL_INTERVAL_MS = 10_000;

@Injectable({ providedIn: 'root' })
export class PendingPhotoService {
  private readonly http = inject(HttpClient);
  private readonly environmentConfig = inject(ENVIRONMENT_CONFIG);

  private readonly sourceId = signal<string | undefined>(undefined);
  private readonly pollTick = signal(0);

  readonly status = resource<PendingPhotoStatus | undefined, {
    sourceId: string | undefined;
    pollTick: number;
  }>({
    params: () => ({ sourceId: this.sourceId(), pollTick: this.pollTick() }),
    loader: async ({ params }) => {
      if (!params.sourceId) {
        return undefined;
      }
      return fetchJson<PendingPhotoStatus>(
        this.http,
        `/api/source/${params.sourceId}/pending-photo`
      );
    },
  });

  readonly hasPending = computed(() => !!this.status.value()?.hasPending);
  readonly expiresAt = computed(() => this.status.value()?.expiresAt);

  readonly previewUrl = computed(() => {
    const sid = this.sourceId();
    if (!sid || !this.hasPending()) {
      return undefined;
    }
    const cacheBuster = this.status.value()?.createdAt ?? '';
    return `/api/source/${sid}/pending-photo/image?t=${encodeURIComponent(cacheBuster)}`;
  });

  constructor() {
    const intervalId = setInterval(() => {
      if (this.sourceId()) {
        this.pollTick.update((n) => n + 1);
      }
    }, POLL_INTERVAL_MS);

    effect((onCleanup) => {
      onCleanup(() => clearInterval(intervalId));
    });
  }

  setSource(sourceId: string | undefined) {
    if (this.sourceId() !== sourceId) {
      this.sourceId.set(sourceId);
    }
  }

  refresh() {
    this.pollTick.update((n) => n + 1);
  }

  async upload(sourceId: string, file: File): Promise<void> {
    await uploadDocument<{ detail: string; expiresAt: string }>(
      this.http,
      `/api/source/${sourceId}/pending-photo`,
      file
    );
    if (this.sourceId() === sourceId) {
      this.refresh();
    }
  }

  async discard(sourceId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`/api/source/${sourceId}/pending-photo`)
    );
    if (this.sourceId() === sourceId) {
      this.refresh();
    }
  }

  async consume(
    sourceId: string,
    cardCount: number
  ): Promise<{ sentences: string[]; model: string }> {
    const model = this.environmentConfig.primaryModelByOperation['extraction'];
    if (!model) {
      throw new Error('No primary extraction model is configured');
    }
    const operationHeaders = { 'X-Operation-ID': crypto.randomUUID() };
    const response = await fetchJson<SentenceList>(
      this.http,
      `/api/source/${sourceId}/pending-photo/consume`,
      {
        body: { model, cardCount },
        method: 'POST',
        headers: operationHeaders,
      }
    );
    if (this.sourceId() === sourceId) {
      this.refresh();
    }
    return { sentences: response.sentences, model };
  }
}
