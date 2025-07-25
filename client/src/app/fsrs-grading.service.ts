import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  FSRS,
  Card as FSRSCard,
  Rating,
  RecordLog,
} from 'ts-fsrs';
import { Card } from './parser/types';
import {
  mapCardStateToTsfsrsState,
  mapTsfsrsStateToCardState,
} from './shared/state/card-state';
import { fetchJson } from './utils/fetchJson';

@Injectable({
  providedIn: 'root',
})
export class FsrsGradingService {
  private readonly http = inject(HttpClient);
  private readonly fsrs = new FSRS({});

  /**
   * Convert Card to FSRS Card format
   */
  private convertToFSRSCard(card: Card): FSRSCard {
    return {
      due: new Date(card.due),
      stability: card.stability,
      difficulty: card.difficulty,
      elapsed_days: card.elapsedDays,
      scheduled_days: card.scheduledDays,
      learning_steps: card.learningSteps,
      reps: card.reps,
      lapses: card.lapses,
      state: mapCardStateToTsfsrsState(card.state),
      last_review: card.lastReview ? new Date(card.lastReview) : undefined,
    };
  }

  /**
   * Convert FSRS Card back to update format
   */
  private convertFromFSRSCard(fsrsCard: FSRSCard, originalCard: Card) {
    return {
      ...originalCard.data,
      due: fsrsCard.due.toISOString(),
      stability: fsrsCard.stability,
      difficulty: fsrsCard.difficulty,
      elapsedDays: fsrsCard.elapsed_days,
      scheduledDays: fsrsCard.scheduled_days,
      reps: fsrsCard.reps,
      lapses: fsrsCard.lapses,
      state: mapTsfsrsStateToCardState(fsrsCard.state),
      lastReview: fsrsCard.last_review?.toISOString(),
    };
  }

  /**
   * Grade a card using FSRS algorithm and save the updated card
   */
  async gradeCard(
    card: Card,
    grade: 'Again' | 'Hard' | 'Good' | 'Easy'
  ): Promise<void> {
    // Convert grade to FSRS Rating
    const rating = this.convertGradeToRating(grade);

    // Convert to FSRS card format
    const fsrsCard = this.convertToFSRSCard(card);

    // Calculate new card state using FSRS
    const schedulingCards: RecordLog = this.fsrs.repeat(fsrsCard, new Date());
    const updatedCard = schedulingCards[rating].card;

    // Convert back to our format
    const cardUpdateData = this.convertFromFSRSCard(updatedCard, card);

    // Save the updated card using existing endpoint
    await fetchJson(this.http, `/api/card/${card.id}`, {
      method: 'PUT',
      body: cardUpdateData,
    });
  }

  /**
   * Convert our grade format to FSRS Rating
   */
  private convertGradeToRating(
    grade: 'Again' | 'Hard' | 'Good' | 'Easy'
  ): Rating.Again | Rating.Hard | Rating.Good | Rating.Easy {
    switch (grade) {
      case 'Again':
        return Rating.Again;
      case 'Hard':
        return Rating.Hard;
      case 'Good':
        return Rating.Good;
      case 'Easy':
        return Rating.Easy;
    }
  }
}
