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
import { ImageResponse, ImageSourceRequest } from './shared/types/image-generation.types';
import { ENVIRONMENT_CONFIG } from './environment/environment.config';
import {
  processTasksWithRateLimit,
  summarizeResults,
  BatchResult,
} from './utils/task-processor';

interface ImageGenerationTask {
  exampleIndex: number;
  englishTranslation: string;
  model: string;
}

interface ImageGenerationResult {
  exampleIndex: number;
  image: ExampleImage;
}

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

    const tasks = itemsToCreate.map(
      (item, index) => () => {
        const request: CardCreationRequest = {
          item,
          sourceId,
          pageNumber,
          cardType
        };
        return this.createSingleCardWithImages(request, index, strategy);
      }
    );

    const results = await processTasksWithRateLimit(
      tasks,
      this.environmentConfig.imageRateLimitPerMinute
    );

    this.isCreating.set(false);

    return summarizeResults(results);
  }

  private async createSingleCardWithImages(
    request: CardCreationRequest,
    progressIndex: number,
    strategy: CardTypeStrategy
  ): Promise<void> {
    const imageInfos = await this.createSingleCard(request, progressIndex);

    if (imageInfos.length > 0) {
      await this.generateImagesForCard(request.item.id, imageInfos, progressIndex, strategy);
    } else {
      this.updateProgress(progressIndex, 'completed', 100, 'Completed');
    }
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

      this.updateProgress(progressIndex, 'generating-images', 90, 'Generating images...');

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

  private async generateImagesForCard(
    cardId: string,
    imageInfos: ImageGenerationInfo[],
    progressIndex: number,
    strategy: CardTypeStrategy
  ): Promise<void> {
    const imageModels = this.environmentConfig.imageModels;

    const tasks: ImageGenerationTask[] = imageInfos.flatMap(info =>
      imageModels.map(model => ({
        exampleIndex: info.exampleIndex,
        englishTranslation: info.englishTranslation,
        model: model.id
      }))
    );

    const totalTasks = tasks.length;
    this.imageGenerationProgress.set({ total: totalTasks, completed: 0 });

    const results = await tasks.reduce<Promise<ImageGenerationResult[]>>(
      async (accPromise, task, index) => {
        const acc = await accPromise;
        try {
          const responses = await fetchJson<ImageResponse[]>(
            this.http,
            `/api/image`,
            {
              body: {
                input: task.englishTranslation,
                model: task.model
              } satisfies ImageSourceRequest,
              method: 'POST',
            }
          );

          this.imageGenerationProgress.update(p => ({ ...p, completed: p.completed + 1 }));

          const imageProgress = ((index + 1) / totalTasks) * 10;
          this.updateProgress(
            progressIndex,
            'generating-images',
            90 + imageProgress,
            `Generating images (${index + 1}/${totalTasks})...`
          );

          return [...acc, ...responses.map(response => ({ exampleIndex: task.exampleIndex, image: response }))];
        } catch {
          this.imageGenerationProgress.update(p => ({ ...p, completed: p.completed + 1 }));
          return acc;
        }
      },
      Promise.resolve([])
    );

    if (results.length > 0) {
      const imagesMap = results.reduce<ImagesByIndex>(
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
