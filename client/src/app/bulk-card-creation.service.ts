import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Word, Card } from './parser/types';
import { fetchJson } from './utils/fetchJson';
import { createEmptyCard } from 'ts-fsrs';
import { FsrsGradingService } from './fsrs-grading.service';
import { mapCardDatesToISOStrings } from './utils/date-mapping.util';
import { VocabularyCardCreationStrategy } from './card-creation-strategies/vocabulary-card-creation.strategy';
import {
  CardCreationProgress,
  BulkCardCreationResult,
  CardCreationRequest,
  CardType
} from './shared/types/card-creation.types';

const MAX_CONCURRENT_CARD_CREATIONS = 3;


@Injectable({
  providedIn: 'root',
})
export class BulkCardCreationService {
  private readonly http = inject(HttpClient);
  private readonly fsrsGradingService = inject(FsrsGradingService);
  private readonly vocabularyStrategy = inject(VocabularyCardCreationStrategy);
  readonly creationProgress = signal<CardCreationProgress[]>([]);
  readonly isCreating = signal(false);

  readonly totalProgress = computed(() => {
    const progress = this.creationProgress();
    if (progress.length === 0) return 0;

    const totalProgress = progress.reduce((sum, card) => sum + card.progress, 0);
    return totalProgress / progress.length;
  });

  async createCardsInBulk(
    words: Word[],
    sourceId: string,
    pageNumber: number,
    cardType: CardType
  ): Promise<BulkCardCreationResult> {
    if (this.isCreating()) {
      throw new Error('Bulk creation already in progress');
    }

    // Filter out words that already have cards
    const wordsToCreate = words.filter(word => !word.exists);

    if (wordsToCreate.length === 0) {
      return {
        totalCards: 0,
        successfulCards: 0,
        failedCards: 0,
        errors: []
      };
    }

    this.isCreating.set(true);

    // Initialize progress tracking
    const initialProgress: CardCreationProgress[] = wordsToCreate.map(word => ({
      word: word.word,
      cardType: cardType,
      status: 'pending',
      progress: 0,
      currentStep: 'Queued for processing'
    }));

    this.creationProgress.set(initialProgress);

    const results = await this.processWithLimitedConcurrency(
      wordsToCreate,
      async (word, index) => {
        const request: CardCreationRequest = {
          word,
          sourceId,
          pageNumber,
          cardType
        };
        await this.createSingleCard(request, index);
      },
      MAX_CONCURRENT_CARD_CREATIONS
    );

    this.isCreating.set(false);

    const successfulCards = results.filter(result => result.status === 'fulfilled').length;
    const failedCards = results.filter(result => result.status === 'rejected').length;
    const errors = results
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map(result => result.reason?.message || 'Unknown error');

    return {
      totalCards: wordsToCreate.length,
      successfulCards,
      failedCards,
      errors
    };
  }

  private async createSingleCard(
    request: CardCreationRequest,
    progressIndex: number
  ): Promise<void> {
    const { word, sourceId, pageNumber, cardType } = request;
    
    try {
      // Get the appropriate strategy for this card type
      const strategy = this.getStrategy(cardType);
      
      // Use strategy to create card data with progress callback
      const progressCallback = (progress: number, step: string) => {
        this.updateProgress(progressIndex, 'translating', progress, step);
      };
      
      const cardData = await strategy.createCardData(request, progressCallback);
      
      // Generic card creation with FSRS (90% progress)
      this.updateProgress(progressIndex, 'creating-card', 90, 'Creating card...');
      
      const emptyCard = createEmptyCard();
      const cardWithFSRS = {
        id: word.id,
        source: { id: sourceId },
        sourcePageNumber: pageNumber,
        data: cardData,
        ...this.fsrsGradingService.convertFromFSRSCard(emptyCard),
        readiness: 'IN_REVIEW'
      } satisfies Card;

      await fetchJson(this.http, `/api/card`, {
        body: mapCardDatesToISOStrings(cardWithFSRS),
        method: 'POST',
      });

      // Complete (100% progress)
      this.updateProgress(progressIndex, 'completed', 100, 'Card created successfully!');

    } catch (error) {
      this.updateProgress(
        progressIndex,
        'error',
        0,
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  private getStrategy(cardType: CardType) {
    switch (cardType) {
      case 'vocabulary':
        return this.vocabularyStrategy;
      // Future card types can be added here:
      // case 'grammar':
      //   return this.grammarStrategy;
      default:
        throw new Error(`No strategy found for card type: ${cardType}`);
    }
  }

  private updateProgress(
    index: number,
    status: CardCreationProgress['status'],
    progress: number,
    currentStep?: string
  ): void {
    this.creationProgress.update(progressList => {
      const newProgress = [...progressList];
      if (newProgress[index]) {
        newProgress[index] = {
          ...newProgress[index],
          status,
          progress,
          currentStep
        };
      }
      return newProgress;
    });
  }

  clearProgress(): void {
    this.creationProgress.set([]);
  }

  private async processWithLimitedConcurrency<T>(
    items: T[],
    processor: (item: T, index: number) => Promise<void>,
    maxConcurrent: number
  ): Promise<PromiseSettledResult<void>[]> {
    const results: PromiseSettledResult<void>[] = new Array(items.length);
    let currentIndex = 0;

    const processNext = async (): Promise<void> => {
      while (currentIndex < items.length) {
        const index = currentIndex++;
        try {
          await processor(items[index], index);
          results[index] = { status: 'fulfilled', value: undefined };
        } catch (error) {
          results[index] = { status: 'rejected', reason: error };
        }
      }
    };

    const workers = Array.from(
      { length: Math.min(maxConcurrent, items.length) },
      () => processNext()
    );

    await Promise.all(workers);
    return results;
  }
}
