import { Injectable, inject, resource } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from '../utils/fetchJson';

export interface ModelUsageLog {
  id: number;
  modelName: string;
  modelType: 'CHAT' | 'IMAGE' | 'AUDIO';
  operationType: string;
  inputTokens: number | null;
  outputTokens: number | null;
  inputCharacters: number | null;
  imageCount: number | null;
  costUsd: number;
  processingTimeMs: number;
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class ModelUsageLogsService {
  private readonly http = inject(HttpClient);

  readonly logs = resource<ModelUsageLog[], unknown>({
    loader: async () => {
      return await fetchJson<ModelUsageLog[]>(this.http, '/api/model-usage-logs');
    },
  });

  refetch() {
    this.logs.reload();
  }
}
