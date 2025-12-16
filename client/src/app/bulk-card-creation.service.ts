import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Word, Card, ExampleImage } from './parser/types';
import { fetchJson } from './utils/fetchJson';
import { createEmptyCard } from 'ts-fsrs';
import { FsrsGradingService } from './fsrs-grading.service';
import { mapCardDatesToISOStrings } from './utils/date-mapping.util';
import { VocabularyCardCreationStrategy } from './card-creation-strategies/vocabulary-card-creation.strategy';
import {
  CardCreationProgress,
  BulkCardCreationResult,
  CardCreationRequest,
  CardType,
  ImageGenerationInfo
} from './shared/types/card-creation.types';
import {
  ImageGenerationModel,
  ImageResponse
} from './shared/types/image-generation.types';

const MAX_CONCURRENT_CARD_CREATIONS = 3;
const IMAGE_MODELS: ImageGenerationModel[] = ['gpt-image-1', 'google-imagen-4-ultra', 'google-nano-banana-pro'];

interface ImageGenerationTask {
  cardId: string;
  exampleIndex: number;
  englishTranslation: string;
  model: ImageGenerationModel;
}

interface ImageGenerationResult {
  cardId: string;
  exampleIndex: number;
  image: ExampleImage;
}

@Injectable({
  providedIn: 'root',
})
export class BulkCardCreationService {
  private readonly http = inject(HttpClient);
  private readonly fsrsGradingService = inject(FsrsGradingService);
  private readonly vocabularyStrategy = inject(VocabularyCardCreationStrategy);
  readonly creationProgress = signal<CardCreationProgress[]>([]);
  readonly isCreating = signal(false);
  readonly imageGenerationProgress = signal<{ total: number; completed: number }>({ total: 0, completed: 0 });

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

    const initialProgress: CardCreationProgress[] = wordsToCreate.map(word => ({
      word: word.word,
      cardType: cardType,
      status: 'pending',
      progress: 0,
      currentStep: 'Queued for processing'
    }));

    this.creationProgress.set(initialProgress);

    const allImageInfos: ImageGenerationInfo[] = [];

    const results = await this.processWithLimitedConcurrency(
      wordsToCreate,
      async (word, index) => {
        const request: CardCreationRequest = {
          word,
          sourceId,
          pageNumber,
          cardType
        };
        const imageInfos = await this.createSingleCard(request, index);
        allImageInfos.push(...imageInfos);
      },
      MAX_CONCURRENT_CARD_CREATIONS
    );

    const successfulCards = results.filter(result => result.status === 'fulfilled').length;
    const failedCards = results.filter(result => result.status === 'rejected').length;
    const errors = results
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map(result => result.reason?.message || 'Unknown error');

    if (allImageInfos.length > 0) {
      await this.generateAllImagesInParallel(allImageInfos);
    }

    this.isCreating.set(false);

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
  ): Promise<ImageGenerationInfo[]> {
    const { word, sourceId, pageNumber, cardType } = request;

    try {
      const strategy = this.getStrategy(cardType);

      const progressCallback = (progress: number, step: string) => {
        this.updateProgress(progressIndex, 'translating', progress * 0.8, step);
      };

      const { cardData, imageGenerationInfos } = await strategy.createCardData(request, progressCallback);

      this.updateProgress(progressIndex, 'creating-card', 85, 'Creating card...');

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

      this.updateProgress(progressIndex, 'completed', 100, 'Card created! Images pending...');

      return imageGenerationInfos;

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

  private async generateAllImagesInParallel(imageInfos: ImageGenerationInfo[]): Promise<void> {
    const tasks: ImageGenerationTask[] = imageInfos.flatMap(info =>
      IMAGE_MODELS.map(model => ({
        cardId: info.cardId,
        exampleIndex: info.exampleIndex,
        englishTranslation: info.englishTranslation,
        model
      }))
    );

    this.imageGenerationProgress.set({ total: tasks.length, completed: 0 });

    const imageResults = await Promise.all(
      tasks.map(async (task): Promise<ImageGenerationResult | null> => {
        try {
          const response = await fetchJson<ImageResponse>(
            this.http,
            `/api/image`,
            {
              body: {
                input: task.englishTranslation,
                model: task.model
              },
              method: 'POST',
            }
          );

          this.imageGenerationProgress.update(p => ({ ...p, completed: p.completed + 1 }));

          return {
            cardId: task.cardId,
            exampleIndex: task.exampleIndex,
            image: { id: response.id }
          };
        } catch {
          this.imageGenerationProgress.update(p => ({ ...p, completed: p.completed + 1 }));
          return null;
        }
      })
    );

    const successfulResults = imageResults.filter((r): r is ImageGenerationResult => r !== null);

    const imagesByCard = new Map<string, Map<number, ExampleImage[]>>();
    for (const result of successfulResults) {
      if (!imagesByCard.has(result.cardId)) {
        imagesByCard.set(result.cardId, new Map());
      }
      const exampleImages = imagesByCard.get(result.cardId)!;
      if (!exampleImages.has(result.exampleIndex)) {
        exampleImages.set(result.exampleIndex, []);
      }
      exampleImages.get(result.exampleIndex)!.push(result.image);
    }

    await Promise.all(
      Array.from(imagesByCard.entries()).map(async ([cardId, exampleImagesMap]) => {
        const card = await fetchJson<Card>(this.http, `/api/card/${cardId}`);

        if (card.data.examples) {
          const updatedExamples = card.data.examples.map((example, idx) => ({
            ...example,
            images: [...(example.images || []), ...(exampleImagesMap.get(idx) || [])]
          }));

          await fetchJson(this.http, `/api/card/${cardId}`, {
            body: { data: { ...card.data, examples: updatedExamples } },
            method: 'PUT',
          });
        }
      })
    );
  }

  private getStrategy(cardType: CardType) {
    switch (cardType) {
      case 'vocabulary':
        return this.vocabularyStrategy;
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
    this.imageGenerationProgress.set({ total: 0, completed: 0 });
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
