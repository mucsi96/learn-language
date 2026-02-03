import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from '../utils/fetchJson';

export type CardTableRow = {
  id: string;
  label: string;
  reviewCount: number;
  state: string;
  sourcePageNumber: number;
  lastReviewGrade: number | null;
  lastReviewDate: string | null;
  lastReviewPerson: string | null;
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
  sortDir?: string;
  state?: string;
  lastReviewGrade?: number;
  minReviews?: number;
  maxReviews?: number;
  lastReviewDate?: string;
};

@Injectable({ providedIn: 'root' })
export class SourceCardsService {
  private readonly http = inject(HttpClient);

  async fetchCards(params: CardTableParams): Promise<CardTableResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set('startRow', String(params.startRow));
    searchParams.set('endRow', String(params.endRow));

    if (params.sortField) searchParams.set('sortField', params.sortField);
    if (params.sortDir) searchParams.set('sortDir', params.sortDir);
    if (params.state) searchParams.set('state', params.state);
    if (params.lastReviewGrade != null) searchParams.set('lastReviewGrade', String(params.lastReviewGrade));
    if (params.minReviews != null) searchParams.set('minReviews', String(params.minReviews));
    if (params.maxReviews != null) searchParams.set('maxReviews', String(params.maxReviews));
    if (params.lastReviewDate) searchParams.set('lastReviewDate', params.lastReviewDate);

    return fetchJson<CardTableResponse>(
      this.http,
      `/api/source/${params.sourceId}/cards?${searchParams.toString()}`
    );
  }

  async updateCardsReadiness(cardIds: string[], readiness: string): Promise<void> {
    await fetchJson(this.http, '/api/cards/readiness', {
      method: 'put',
      body: { cardIds, readiness },
    });
  }
}
