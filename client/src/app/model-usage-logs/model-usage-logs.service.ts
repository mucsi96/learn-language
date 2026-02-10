import { Injectable, inject, resource, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { fetchJson } from '../utils/fetchJson';
import { ENVIRONMENT_CONFIG } from '../environment/environment.config';

export interface ModelUsageLog {
  id: number;
  modelName: string;
  modelType: 'CHAT' | 'IMAGE' | 'AUDIO';
  operationType: string;
  operationId: string | null;
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

export interface ModelUsageLogTableResponse {
  rows: ModelUsageLog[];
  totalCount: number;
}

export interface ModelSummary {
  operationType: string;
  modelName: string;
  totalCalls: number;
  ratedCalls: number;
  averageRating: number;
  totalCost: number;
}

export interface OperationTypeSummaryGroup {
  operationType: string;
  summaries: ModelSummary[];
}

export type ModelType = 'CHAT' | 'IMAGE' | 'AUDIO';

export interface DateFilterOption {
  label: string;
  value: string;
}

export interface OperationGroup {
  operationId: string | null;
  logs: ModelUsageLog[];
  primaryLog: ModelUsageLog | null;
}

export interface DiffLine {
  type: 'same' | 'added' | 'removed';
  content: string;
}

export interface DiffSummary {
  additions: number;
  deletions: number;
}

export interface ModelUsageLogFetchParams {
  startRow: number;
  endRow: number;
  date?: string;
  modelType?: string;
  operationType?: string;
  modelName?: string;
  sortField?: string;
  sortDirection?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ModelUsageLogsService {
  private readonly http = inject(HttpClient);
  private readonly environmentConfig = inject(ENVIRONMENT_CONFIG);

  readonly dateFilter = signal<string>(this.getTodayDateString());
  readonly modelTypeFilter = signal<ModelType | 'ALL'>('ALL');
  readonly operationTypeFilter = signal<string>('ALL');
  readonly modelNameFilter = signal<string>('ALL');

  readonly summary = resource<ModelSummary[], unknown>({
    loader: async () => {
      return await fetchJson<ModelSummary[]>(this.http, '/api/model-usage-logs/summary');
    },
  });

  readonly groupedSummary = computed<OperationTypeSummaryGroup[]>(() => {
    const summaries = this.summary.value() ?? [];
    const grouped = summaries.reduce(
      (acc, s) => {
        const existing = acc.get(s.operationType) ?? [];
        return new Map(acc).set(s.operationType, [...existing, s]);
      },
      new Map<string, ModelSummary[]>()
    );
    return Array.from(grouped.entries()).map(([operationType, items]) => ({
      operationType,
      summaries: items,
    }));
  });

  readonly availableDates = computed<DateFilterOption[]>(() => {
    const today = this.getTodayDateString();
    const yesterday = this.getYesterdayDateString();

    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      if (dateStr === today) {
        return { label: 'Today', value: dateStr };
      } else if (dateStr === yesterday) {
        return { label: 'Yesterday', value: dateStr };
      }
      return { label: this.formatDateLabel(dateStr), value: dateStr };
    });
  });

  readonly availableModelTypes: ModelType[] = ['CHAT', 'IMAGE', 'AUDIO'];

  readonly availableOperationTypes: string[] = [
    'translation', 'extraction', 'classification', 'image_generation', 'audio_generation',
  ];

  async fetchLogs(params: ModelUsageLogFetchParams): Promise<ModelUsageLogTableResponse> {
    const httpParams = Object.entries({
      startRow: params.startRow,
      endRow: params.endRow,
      ...(params.date ? { date: params.date } : {}),
      ...(params.modelType ? { modelType: params.modelType } : {}),
      ...(params.operationType ? { operationType: params.operationType } : {}),
      ...(params.modelName ? { modelName: params.modelName } : {}),
      ...(params.sortField ? { sortField: params.sortField } : {}),
      ...(params.sortDirection ? { sortDirection: params.sortDirection } : {}),
    }).reduce(
      (acc, [key, value]) => acc.set(key, String(value)),
      new HttpParams()
    );

    return firstValueFrom(
      this.http.get<ModelUsageLogTableResponse>('/api/model-usage-logs', { params: httpParams })
    );
  }

  groupLogs(logs: ModelUsageLog[]): OperationGroup[] {
    const groupMap = logs.reduce((acc, log) => {
      if (!log.operationId) return acc;
      const existing = acc.get(log.operationId) ?? [];
      return new Map(acc).set(log.operationId, [...existing, log]);
    }, new Map<string, ModelUsageLog[]>());

    const processedOperationIds = new Set<string>();

    return logs.reduce<OperationGroup[]>((groups, log) => {
      if (log.operationId && !processedOperationIds.has(log.operationId)) {
        processedOperationIds.add(log.operationId);
        const groupLogs = groupMap.get(log.operationId) ?? [];
        const primaryLog = this.findPrimaryLog(groupLogs);
        return [...groups, { operationId: log.operationId, logs: groupLogs, primaryLog }];
      } else if (!log.operationId) {
        return [...groups, { operationId: null, logs: [log], primaryLog: null }];
      }
      return groups;
    }, []);
  }

  private findPrimaryLog(logs: ModelUsageLog[]): ModelUsageLog | null {
    if (logs.length <= 1) return logs[0] ?? null;
    const operationType = logs[0].operationType;
    const primaryModelName = this.environmentConfig.primaryModelByOperation[operationType];
    if (primaryModelName) {
      const primaryLog = logs.find(log => log.modelName === primaryModelName);
      if (primaryLog) return primaryLog;
    }
    return logs[0];
  }

  computeDiff(primary: string, secondary: string): DiffLine[] {
    const primaryLines = primary.split('\n');
    const secondaryLines = secondary.split('\n');

    const lcs = this.longestCommonSubsequence(primaryLines, secondaryLines);

    const result: DiffLine[] = [];
    let pi = 0;
    let si = 0;
    let li = 0;

    while (pi < primaryLines.length || si < secondaryLines.length) {
      if (li < lcs.length && pi < primaryLines.length && si < secondaryLines.length
          && primaryLines[pi] === lcs[li] && secondaryLines[si] === lcs[li]) {
        result.push({ type: 'same', content: lcs[li] });
        pi++;
        si++;
        li++;
      } else if (pi < primaryLines.length && (li >= lcs.length || primaryLines[pi] !== lcs[li])) {
        result.push({ type: 'removed', content: primaryLines[pi] });
        pi++;
      } else if (si < secondaryLines.length && (li >= lcs.length || secondaryLines[si] !== lcs[li])) {
        result.push({ type: 'added', content: secondaryLines[si] });
        si++;
      }
    }

    return result;
  }

  computeDiffSummary(primary: string, secondary: string): DiffSummary {
    const diff = this.computeDiff(primary, secondary);
    return {
      additions: diff.filter(l => l.type === 'added').length,
      deletions: diff.filter(l => l.type === 'removed').length,
    };
  }

  private longestCommonSubsequence(a: string[], b: string[]): string[] {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }

    const result: string[] = [];
    let i = m;
    let j = n;
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        result.unshift(a[i - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    return result;
  }

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
    await fetchJson(this.http, `/api/model-usage-logs/${id}/rating`, {
      method: 'patch',
      body: { rating },
    });

    this.summary.reload();
  }

  async deleteLogs(): Promise<void> {
    const dateFilter = this.dateFilter();
    if (dateFilter === 'ALL') return;

    const params = new URLSearchParams({ date: dateFilter });

    const modelTypeFilter = this.modelTypeFilter();
    if (modelTypeFilter !== 'ALL') {
      params.set('modelType', modelTypeFilter);
    }

    const operationTypeFilter = this.operationTypeFilter();
    if (operationTypeFilter !== 'ALL') {
      params.set('operationType', operationTypeFilter);
    }

    const modelNameFilter = this.modelNameFilter();
    if (modelNameFilter !== 'ALL') {
      params.set('modelName', modelNameFilter);
    }

    await fetchJson(this.http, `/api/model-usage-logs?${params.toString()}`, {
      method: 'delete',
    });

    this.summary.reload();
  }
}
