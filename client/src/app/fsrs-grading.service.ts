import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Rating } from 'ts-fsrs';
import { Card } from './parser/types';
import { scheduler, toSchedulerCard, toCardUpdate } from './shared/state/fsrs-scheduler';
import { fetchJson } from './utils/fetchJson';
import { mapCardDatesToISOStrings } from './utils/date-mapping.util';

@Injectable({
  providedIn: 'root',
})
export class FsrsGradingService {
  private readonly http = inject(HttpClient);

  async gradeCard(
    card: Card,
    grade: 'Again' | 'Good',
    learningPartnerId?: number | null,
    reviewDuration?: number | null
  ): Promise<void> {
    const rating = Rating[grade];
    const result = scheduler.review({
      card: toSchedulerCard(card),
      now: new Date(),
      grade: rating,
    });

    await fetchJson(this.http, `/api/card/${card.id}`, {
      method: 'PUT',
      body: {
        ...mapCardDatesToISOStrings(toCardUpdate(result)),
        learningPartnerId: learningPartnerId ?? null,
        rating,
        reviewDuration: reviewDuration ?? null,
      },
    });
  }
}
