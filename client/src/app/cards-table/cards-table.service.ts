import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export type CardTableRow = {
  id: string;
  label: string;
  readiness: string;
  state: string;
  reps: number;
  lastReview: string | null;
  lastReviewRating: number | null;
  lastReviewPerson: string | null;
  sourcePageNumber: number;
};

export type CardTableResponse = {
  rows: CardTableRow[];
  totalCount: number;
};

export type CardTableParams = {
  sourceId: string;
  startRow: number;
  endRow: number;
  sortField?: string;
  sortDirection?: string;
  readiness?: string;
  state?: string;
  minReps?: number;
  maxReps?: number;
  lastReviewFrom?: string;
  lastReviewTo?: string;
  lastReviewRating?: number;
};

@Injectable({ providedIn: 'root' })
export class CardsTableService {
  private readonly http = inject(HttpClient);

  async fetchCards(params: CardTableParams): Promise<CardTableResponse> {
    const httpParams = Object.entries({
      startRow: params.startRow,
      endRow: params.endRow,
      ...(params.sortField ? { sortField: params.sortField } : {}),
      ...(params.sortDirection ? { sortDirection: params.sortDirection } : {}),
      ...(params.readiness ? { readiness: params.readiness } : {}),
      ...(params.state ? { state: params.state } : {}),
      ...(params.minReps !== undefined ? { minReps: params.minReps } : {}),
      ...(params.maxReps !== undefined ? { maxReps: params.maxReps } : {}),
      ...(params.lastReviewFrom ? { lastReviewFrom: params.lastReviewFrom } : {}),
      ...(params.lastReviewTo ? { lastReviewTo: params.lastReviewTo } : {}),
      ...(params.lastReviewRating !== undefined
        ? { lastReviewRating: params.lastReviewRating }
        : {}),
    }).reduce(
      (acc, [key, value]) => acc.set(key, String(value)),
      new HttpParams()
    );

    return firstValueFrom(
      this.http.get<CardTableResponse>(
        `/api/source/${params.sourceId}/cards`,
        { params: httpParams }
      )
    );
  }

  async markCardsAsKnown(cardIds: readonly string[]): Promise<void> {
    await firstValueFrom(
      this.http.put('/api/cards/mark-known', cardIds)
    );
  }
}
