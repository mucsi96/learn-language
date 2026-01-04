import { Injectable, inject, resource, signal, computed } from '@angular/core';
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

export type ModelType = 'CHAT' | 'IMAGE' | 'AUDIO';

export interface DateFilterOption {
  label: string;
  value: string;
}

@Injectable({
  providedIn: 'root',
})
export class ModelUsageLogsService {
  private readonly http = inject(HttpClient);

  readonly dateFilter = signal<string>(this.getTodayDateString());
  readonly modelTypeFilter = signal<ModelType | 'ALL'>('ALL');
  readonly operationTypeFilter = signal<string>('ALL');
  readonly modelNameFilter = signal<string>('ALL');

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

  readonly availableDates = computed<DateFilterOption[]>(() => {
    const logs = this.logs.value() ?? [];
    const dateSet = new Set<string>();
    logs.forEach(log => {
      const date = log.createdAt.split('T')[0];
      dateSet.add(date);
    });

    const today = this.getTodayDateString();
    const yesterday = this.getYesterdayDateString();

    const options: DateFilterOption[] = [];
    const sortedDates = Array.from(dateSet).sort((a, b) => b.localeCompare(a));

    sortedDates.forEach(date => {
      if (date === today) {
        options.push({ label: 'Today', value: date });
      } else if (date === yesterday) {
        options.push({ label: 'Yesterday', value: date });
      } else {
        options.push({ label: this.formatDateLabel(date), value: date });
      }
    });

    return options;
  });

  readonly availableModelTypes = computed<ModelType[]>(() => {
    const logs = this.logs.value() ?? [];
    const types = new Set<ModelType>();
    logs.forEach(log => types.add(log.modelType));
    return Array.from(types).sort();
  });

  readonly availableOperationTypes = computed<string[]>(() => {
    const logs = this.logs.value() ?? [];
    const types = new Set<string>();
    logs.forEach(log => types.add(log.operationType));
    return Array.from(types).sort();
  });

  readonly availableModelNames = computed<string[]>(() => {
    const logs = this.logs.value() ?? [];
    const names = new Set<string>();
    logs.forEach(log => names.add(log.modelName));
    return Array.from(names).sort();
  });

  readonly hasAnyLogs = computed<boolean>(() => {
    const logs = this.logs.value() ?? [];
    return logs.length > 0;
  });

  readonly filteredAndSortedLogs = computed<ModelUsageLog[]>(() => {
    const logs = this.logs.value() ?? [];
    const dateFilter = this.dateFilter();
    const modelTypeFilter = this.modelTypeFilter();
    const operationTypeFilter = this.operationTypeFilter();
    const modelNameFilter = this.modelNameFilter();

    let filtered = logs.filter(log => {
      const logDate = log.createdAt.split('T')[0];
      if (dateFilter !== 'ALL' && logDate !== dateFilter) return false;
      if (modelTypeFilter !== 'ALL' && log.modelType !== modelTypeFilter) return false;
      if (operationTypeFilter !== 'ALL' && log.operationType !== operationTypeFilter) return false;
      if (modelNameFilter !== 'ALL' && log.modelName !== modelNameFilter) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);

      const datePartA = a.createdAt.split('T')[0];
      const datePartB = b.createdAt.split('T')[0];
      const hourA = dateA.getHours();
      const hourB = dateB.getHours();

      if (datePartA !== datePartB) {
        return datePartB.localeCompare(datePartA);
      }

      if (hourA !== hourB) {
        return hourB - hourA;
      }

      const opCompare = a.operationType.localeCompare(b.operationType);
      if (opCompare !== 0) return opCompare;

      return a.processingTimeMs - b.processingTimeMs;
    });
  });

  private getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getYesterdayDateString(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }

  private formatDateLabel(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

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
