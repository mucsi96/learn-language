import { Injectable, inject, resource, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from '../utils/fetchJson';

export type CardTableRow = {
  id: string;
  sourceName: string;
  sourceType: string | null;
  label: string;
  reviewCount: number;
  lastReviewDate: string | null;
  lastReviewGrade: number | null;
  lastReviewPerson: string | null;
  readiness: string;
  sourceId: string;
  sourcePageNumber: number;
};

export type ReviewCountRange = 'ALL' | '0' | '1-5' | '6-10' | '10+';
export type GradeFilter = 'ALL' | '1' | '2' | '3' | '4';

@Injectable({
  providedIn: 'root',
})
export class CardsTableService {
  private readonly http = inject(HttpClient);

  readonly reviewCountFilter = signal<ReviewCountRange>('ALL');
  readonly lastReviewDateFilter = signal<string>('ALL');
  readonly lastReviewGradeFilter = signal<GradeFilter>('ALL');

  readonly cards = resource<CardTableRow[], unknown>({
    loader: async () => {
      return await fetchJson<CardTableRow[]>(this.http, '/api/cards/table');
    },
  });

  readonly availableDates = computed(() => {
    const rows = this.cards.value() ?? [];
    const dateSet = new Set<string>();
    rows.forEach((row) => {
      if (row.lastReviewDate) {
        dateSet.add(row.lastReviewDate.split('T')[0]);
      }
    });
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    return Array.from(dateSet)
      .sort((a, b) => b.localeCompare(a))
      .map((date) => ({
        label:
          date === today
            ? 'Today'
            : date === yesterday
              ? 'Yesterday'
              : new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                }),
        value: date,
      }));
  });

  readonly filteredRows = computed(() => {
    const rows = this.cards.value() ?? [];
    const reviewCountFilter = this.reviewCountFilter();
    const lastReviewDateFilter = this.lastReviewDateFilter();
    const lastReviewGradeFilter = this.lastReviewGradeFilter();

    return rows.filter((row) => {
      if (reviewCountFilter !== 'ALL') {
        if (reviewCountFilter === '0' && row.reviewCount !== 0) return false;
        if (reviewCountFilter === '1-5' && (row.reviewCount < 1 || row.reviewCount > 5))
          return false;
        if (reviewCountFilter === '6-10' && (row.reviewCount < 6 || row.reviewCount > 10))
          return false;
        if (reviewCountFilter === '10+' && row.reviewCount <= 10) return false;
      }

      if (lastReviewDateFilter !== 'ALL') {
        if (!row.lastReviewDate) return false;
        if (row.lastReviewDate.split('T')[0] !== lastReviewDateFilter) return false;
      }

      if (lastReviewGradeFilter !== 'ALL') {
        if (row.lastReviewGrade === null) return false;
        if (row.lastReviewGrade !== Number(lastReviewGradeFilter)) return false;
      }

      return true;
    });
  });

  async markAsKnown(cardIds: string[]): Promise<void> {
    await fetchJson(this.http, '/api/cards/mark-known', {
      method: 'put',
      body: cardIds,
    });
    this.cards.reload();
  }

  reload(): void {
    this.cards.reload();
  }
}
