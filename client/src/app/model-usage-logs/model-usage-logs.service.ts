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
  responseContent: string | null;
  rating: number | null;
  createdAt: string;
}

export interface ModelSummary {
  modelName: string;
  totalCalls: number;
  ratedCalls: number;
  averageRating: number;
  totalCost: number;
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

  readonly summary = resource<ModelSummary[], unknown>({
    loader: async () => {
      return await fetchJson<ModelSummary[]>(this.http, '/api/model-usage-logs/summary');
    },
  });

  async updateRating(id: number, rating: number | null): Promise<void> {
    const currentLog = this.logs.value()?.find((log) => log.id === id);
    const responseContent = currentLog?.responseContent;

    this.logs.update((currentLogs) =>
      currentLogs?.map((log) => {
        if (log.id === id) {
          return { ...log, rating };
        }
        if (responseContent && log.responseContent === responseContent) {
          return { ...log, rating };
        }
        return log;
      })
    );

    await fetchJson(this.http, `/api/model-usage-logs/${id}/rating`, {
      method: 'patch',
      body: { rating },
    });

    this.summary.reload();
  }

  refetch() {
    this.logs.reload();
    this.summary.reload();
  }
}
