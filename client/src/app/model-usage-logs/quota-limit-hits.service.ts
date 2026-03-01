import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface QuotaLimitHit {
  id: number;
  serviceName: string;
  modelName: string;
  operationType: string;
  quotaType: string;
  errorCode: number | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface QuotaLimitHitTableResponse {
  rows: QuotaLimitHit[];
  totalCount: number;
}

export interface DateFilterOption {
  label: string;
  value: string;
}

export interface QuotaLimitHitFetchParams {
  startRow: number;
  endRow: number;
  date?: string;
  quotaType?: string;
  modelName?: string;
  sortField?: string;
  sortDirection?: string;
}

@Injectable({
  providedIn: 'root',
})
export class QuotaLimitHitsService {
  private readonly http = inject(HttpClient);

  readonly dateFilter = signal<string>(this.getTodayDateString());
  readonly quotaTypeFilter = signal<string>('ALL');
  readonly modelNameFilter = signal<string>('ALL');

  readonly availableQuotaTypes: string[] = ['RPM', 'TPM', 'RPD', 'IPM'];

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

  async fetchHits(params: QuotaLimitHitFetchParams): Promise<QuotaLimitHitTableResponse> {
    const httpParams = Object.entries({
      startRow: params.startRow,
      endRow: params.endRow,
      ...(params.date ? { date: params.date } : {}),
      ...(params.quotaType ? { quotaType: params.quotaType } : {}),
      ...(params.modelName ? { modelName: params.modelName } : {}),
      ...(params.sortField ? { sortField: params.sortField } : {}),
      ...(params.sortDirection ? { sortDirection: params.sortDirection } : {}),
    }).reduce(
      (acc, [key, value]) => acc.set(key, String(value)),
      new HttpParams()
    );

    return firstValueFrom(
      this.http.get<QuotaLimitHitTableResponse>('/api/quota-limit-hits', { params: httpParams })
    );
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
}
