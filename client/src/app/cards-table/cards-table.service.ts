import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export type CardTableRow = {
  id: string;
  label: string;
  readiness: string;
  state: string;
  reps: number;
  lastReviewDaysAgo: number | null;
  lastReviewRating: number | null;
  lastReviewPerson: string | null;
  reviewScore: number | null;
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
  lastReviewDaysAgo?: number;
  lastReviewRating?: number;
  minReviewScore?: number;
  maxReviewScore?: number;
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
      ...(params.lastReviewDaysAgo !== undefined
        ? { lastReviewDaysAgo: params.lastReviewDaysAgo }
        : {}),
      ...(params.lastReviewRating !== undefined
        ? { lastReviewRating: params.lastReviewRating }
        : {}),
      ...(params.minReviewScore !== undefined
        ? { minReviewScore: params.minReviewScore }
        : {}),
      ...(params.maxReviewScore !== undefined
        ? { maxReviewScore: params.maxReviewScore }
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

  async fetchFilteredCardIds(params: {
    sourceId: string;
    readiness?: string;
    state?: string;
    lastReviewDaysAgo?: number;
    lastReviewRating?: number;
    minReviewScore?: number;
    maxReviewScore?: number;
  }): Promise<string[]> {
    const httpParams = Object.entries({
      ...(params.readiness ? { readiness: params.readiness } : {}),
      ...(params.state ? { state: params.state } : {}),
      ...(params.lastReviewDaysAgo !== undefined
        ? { lastReviewDaysAgo: params.lastReviewDaysAgo }
        : {}),
      ...(params.lastReviewRating !== undefined
        ? { lastReviewRating: params.lastReviewRating }
        : {}),
      ...(params.minReviewScore !== undefined
        ? { minReviewScore: params.minReviewScore }
        : {}),
      ...(params.maxReviewScore !== undefined
        ? { maxReviewScore: params.maxReviewScore }
        : {}),
    }).reduce(
      (acc, [key, value]) => acc.set(key, String(value)),
      new HttpParams()
    );

    return firstValueFrom(
      this.http.get<string[]>(
        `/api/source/${params.sourceId}/card-ids`,
        { params: httpParams }
      )
    );
  }

  async markCardsAsKnown(cardIds: readonly string[]): Promise<void> {
    await firstValueFrom(
      this.http.put('/api/cards/mark-known', cardIds)
    );
  }

  async deleteCards(cardIds: readonly string[]): Promise<void> {
    await firstValueFrom(
      this.http.delete('/api/cards', { body: cardIds })
    );
  }

  async deleteCardsAudio(cardIds: readonly string[]): Promise<void> {
    await firstValueFrom(
      this.http.delete('/api/cards/audio', { body: cardIds })
    );
  }

  async refreshCardView(): Promise<void> {
    await firstValueFrom(
      this.http.post('/api/cards/refresh-view', null)
    );
  }
}
