import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Card, ExampleImage } from './parser/types';
import { fetchJson } from './utils/fetchJson';
import { createEmptyCard } from 'ts-fsrs';
import { FsrsGradingService } from './fsrs-grading.service';
import { mapCardDatesToISOStrings } from './utils/date-mapping.util';
import { CardTypeRegistry } from './cardTypes/card-type.registry';
import {
  CardCreationRequest,
  CardType,
  CardTypeStrategy,
  ImageGenerationInfo,
  ExtractedItem,
  ImagesByIndex,
} from './parser/types';
import { CardCreationProgress } from './shared/types/card-creation.types';
import {
  BatchImageRequest,
  BatchImageJobResponse,
  BatchImageStatusResponse,
  BatchImageResultItem,
} from './shared/types/image-generation.types';
import { ENVIRONMENT_CONFIG } from './environment/environment.config';
import {
  processTasksWithRateLimit,
  summarizeResults,
  BatchResult,
} from './utils/task-processor';

interface ImageGenerationTask {
  customId: string;
  cardId: string;
  exampleIndex: number;
  englishTranslation: string;
  model: string;
  progressIndex: number;
}

interface ImageGenerationResult {
  cardId: string;
  exampleIndex: number;
  image: ExampleImage;
}

const BATCH_POLL_INTERVAL_MS = 2000;

@Injectable({
  providedIn: 'root',
})
export class BulkCardCreationService {
  private readonly http = inject(HttpClient);
  private readonly fsrsGradingService = inject(FsrsGradingService);
  private readonly strategyRegistry = inject(CardTypeRegistry);
  private readonly environmentConfig = inject(ENVIRONMENT_CONFIG);
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
    items: ExtractedItem[],
    sourceId: string,
    pageNumber: number,
    cardType: CardType
  ): Promise<BatchResult> {
    if (this.isCreating()) {
      throw new Error('Bulk creation already in progress');
    }

    const itemsToCreate = items.filter(item => !item.exists);

    if (itemsToCreate.length === 0) {
      return { total: 0, succeeded: 0, failed: 0, errors: [] };
    }

    this.isCreating.set(true);

    const strategy = this.strategyRegistry.getStrategy(cardType);

    const initialProgress: CardCreationProgress[] = itemsToCreate.map(item => ({
      itemLabel: strategy.getItemLabel(item),
      cardType: cardType,
      status: 'pending',
      progress: 0,
      currentStep: 'Queued for processing'
    }));

    this.creationProgress.set(initialProgress);

    const allImageTasks: ImageGenerationTask[] = [];
    const cardCreationTasks = itemsToCreate.map(
      (item, index) => () => {
        const request: CardCreationRequest = {
          item,
          sourceId,
          pageNumber,
          cardType
        };
        return this.createSingleCard(request, index).then(imageInfos => ({
          cardId: item.id,
          imageInfos,
          progressIndex: index
        }));
      }
    );

    const cardResults = await processTasksWithRateLimit(
      cardCreationTasks,
      this.environmentConfig.imageRateLimitPerMinute
    );

    const imageModels = this.environmentConfig.imageModels;
    let taskCounter = 0;

    const successfulCards = cardResults
      .filter((r): r is PromiseFulfilledResult<{ cardId: string; imageInfos: ImageGenerationInfo[]; progressIndex: number }> =>
        r.status === 'fulfilled')
      .map(r => r.value);

    for (const { cardId, imageInfos, progressIndex } of successfulCards) {
      for (const info of imageInfos) {
        for (const model of imageModels) {
          allImageTasks.push({
            customId: `${cardId}-${info.exampleIndex}-${model.id}-${taskCounter++}`,
            cardId,
            exampleIndex: info.exampleIndex,
            englishTranslation: info.englishTranslation,
            model: model.id,
            progressIndex,
          });
        }
      }
    }

    if (allImageTasks.length > 0) {
      const totalTasks = allImageTasks.length;
      this.imageGenerationProgress.set({ total: totalTasks, completed: 0 });

      for (const { progressIndex } of successfulCards) {
        this.updateProgress(progressIndex, 'generating-images', 90, 'Generating images...');
      }

      const imageResults = await this.generateImagesBatch(allImageTasks);

      const resultsByCard = imageResults.reduce<Map<string, ImageGenerationResult[]>>(
        (acc, result) => {
          const existing = acc.get(result.cardId) ?? [];
          return new Map([...acc, [result.cardId, [...existing, result]]]);
        },
        new Map()
      );

      for (const { cardId, progressIndex } of successfulCards) {
        const cardImageResults = resultsByCard.get(cardId) ?? [];
        if (cardImageResults.length > 0) {
          const imagesMap = cardImageResults.reduce<ImagesByIndex>(
            (acc, result) => {
              const existing = acc.get(result.exampleIndex) ?? [];
              return new Map([...acc, [result.exampleIndex, [...existing, result.image]]]);
            },
            new Map()
          );

          const card = await fetchJson<Card>(this.http, `/api/card/${cardId}`);
          const updatedData = strategy.updateCardDataWithImages(card.data, imagesMap);

          await fetchJson(this.http, `/api/card/${cardId}`, {
            body: { data: updatedData },
            method: 'PUT',
          });
        }

        this.updateProgress(progressIndex, 'completed', 100, 'Completed');
      }
    } else {
      for (const { progressIndex } of successfulCards) {
        this.updateProgress(progressIndex, 'completed', 100, 'Completed');
      }
    }

    this.isCreating.set(false);

    return summarizeResults(cardResults);
  }

  private async createSingleCard(
    request: CardCreationRequest,
    progressIndex: number
  ): Promise<ImageGenerationInfo[]> {
    const { item, sourceId, pageNumber, cardType } = request;

    try {
      const strategy = this.strategyRegistry.getStrategy(cardType);

      const progressCallback = (progress: number, step: string) => {
        this.updateProgress(progressIndex, 'translating', progress * 0.8, step);
      };

      const { cardData, imageGenerationInfos } = await strategy.createCardData(request, progressCallback);

      this.updateProgress(progressIndex, 'creating-card', 85, 'Creating card...');

      const emptyCard = createEmptyCard();
      const cardWithFSRS = {
        id: item.id,
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

  private async generateImagesBatch(
    tasks: ImageGenerationTask[]
  ): Promise<ImageGenerationResult[]> {
    const batchRequest: BatchImageRequest = {
      requests: tasks.map(task => ({
        customId: task.customId,
        input: task.englishTranslation,
        model: task.model,
      })),
    };

    const { batchId } = await fetchJson<BatchImageJobResponse>(
      this.http,
      `/api/batch-images`,
      { body: batchRequest, method: 'POST' }
    );

    const statusResponse = await this.pollBatchCompletion(batchId);

    const taskMap = new Map(tasks.map(t => [t.customId, t]));

    return (statusResponse.results ?? [])
      .filter((r): r is BatchImageResultItem & { image: NonNullable<BatchImageResultItem['image']> } =>
        r.image != null)
      .map(result => {
        const task = taskMap.get(result.customId);
        this.imageGenerationProgress.update(p => ({ ...p, completed: p.completed + 1 }));
        return {
          cardId: task?.cardId ?? '',
          exampleIndex: task?.exampleIndex ?? 0,
          image: result.image,
        };
      });
  }

  private async pollBatchCompletion(batchId: string): Promise<BatchImageStatusResponse> {
    while (true) {
      const status = await fetchJson<BatchImageStatusResponse>(
        this.http,
        `/api/batch-images/${batchId}`
      );

      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }

      await new Promise(resolve => setTimeout(resolve, BATCH_POLL_INTERVAL_MS));
    }
  }

  private updateProgress(
    index: number,
    status: CardCreationProgress['status'],
    progress: number,
    currentStep?: string
  ): void {
    this.creationProgress.update(progressList =>
      progressList.map((item, i) =>
        i === index
          ? { ...item, status, progress, currentStep }
          : item
      )
    );
  }

  clearProgress(): void {
    this.creationProgress.set([]);
    this.imageGenerationProgress.set({ total: 0, completed: 0 });
  }
}
