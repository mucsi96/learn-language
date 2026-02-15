import { Injectable, inject, signal } from '@angular/core';
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
import { DotProgress, DotStatus } from './shared/types/dot-progress.types';
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
  readonly phase1Progress = signal<DotProgress[]>([]);
  readonly phase2Progress = signal<DotProgress[]>([]);
  readonly isCreating = signal(false);

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

    this.phase1Progress.set(itemsToCreate.map(item => ({
      label: strategy.getItemLabel(item),
      status: 'pending' as const,
      tooltip: `${strategy.getItemLabel(item)}: Queued`,
    })));
    this.phase2Progress.set([]);

    const phase1Tasks = itemsToCreate.map(
      (item, index) => () => {
        const request: CardCreationRequest = { item, sourceId, pageNumber, cardType };
        return this.createSingleCard(request, index, strategy);
      }
    );

    const phase1Results = await processTasksWithRateLimit(phase1Tasks, null);

    const imageItems = phase1Results.reduce<
      Array<{ cardId: string; imageInfos: ImageGenerationInfo[]; label: string }>
    >(
      (acc, result, index) => {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          return [...acc, {
            cardId: itemsToCreate[index].id,
            imageInfos: result.value,
            label: strategy.getItemLabel(itemsToCreate[index]),
          }];
        }
        return acc;
      },
      []
    );

    if (imageItems.length > 0) {
      this.phase2Progress.set(imageItems.map(item => ({
        label: item.label,
        status: 'pending' as const,
        tooltip: `${item.label}: Queued`,
      })));

      const phase2Tasks = imageItems.map(
        (item, phase2Index) => () =>
          this.generateImagesForCard(item.cardId, item.imageInfos, phase2Index, strategy)
      );

      await processTasksWithRateLimit(
        phase2Tasks,
        this.environmentConfig.imageRateLimitPerMinute
      );
    }

    await fetchJson(this.http, `/api/cards/refresh-view`, { method: 'POST' });

    this.isCreating.set(false);

    return summarizeResults(phase1Results);
  }

  private async createSingleCard(
    request: CardCreationRequest,
    progressIndex: number,
    strategy: CardTypeStrategy
  ): Promise<ImageGenerationInfo[]> {
    const { item, sourceId, pageNumber } = request;
    const label = strategy.getItemLabel(item);

    try {
      this.updatePhase1(progressIndex, 'in-progress', `${label}: Translating...`);

      const progressCallback = (_progress: number, step: string) => {
        this.updatePhase1(progressIndex, 'in-progress', `${label}: ${step}`);
      };

      const { cardData, imageGenerationInfos } = await strategy.createCardData(request, progressCallback);

      this.updatePhase1(progressIndex, 'in-progress', `${label}: Creating card...`);

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

      this.updatePhase1(progressIndex, 'completed', `${label}: Done`);

      return imageGenerationInfos;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.updatePhase1(progressIndex, 'error', `${label}: Error - ${errorMsg}`);
      throw error;
    }
  }

  private async generateImagesForCard(
    cardId: string,
    imageInfos: ImageGenerationInfo[],
    progressIndex: number,
    strategy: CardTypeStrategy
  ): Promise<void> {
    const label = this.phase2Progress()[progressIndex].label;

    try {
      this.updatePhase2(progressIndex, 'in-progress', `${label}: Starting image generation...`);

      const imageModels = this.environmentConfig.imageModels;

      const tasks: ImageGenerationTask[] = imageInfos.flatMap(info =>
        imageModels.map(model => ({
          exampleIndex: info.exampleIndex,
          englishTranslation: info.englishTranslation,
          model: model.id
        }))
      );

      const totalTasks = tasks.length;

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

            this.updatePhase2(
              progressIndex,
              'in-progress',
              `${label}: Generating images (${index + 1}/${totalTasks})...`
            );

            return [...acc, ...responses.map(response => ({ exampleIndex: task.exampleIndex, image: response }))];
          } catch {
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

      this.updatePhase2(progressIndex, 'completed', `${label}: Done`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.updatePhase2(progressIndex, 'error', `${label}: Error - ${errorMsg}`);
      throw error;
    }
  }

  private updatePhase1(index: number, status: DotStatus, tooltip: string): void {
    this.phase1Progress.update(dots =>
      dots.map((dot, i) => i === index ? { ...dot, status, tooltip } : dot)
    );
  }

  private updatePhase2(index: number, status: DotStatus, tooltip: string): void {
    this.phase2Progress.update(dots =>
      dots.map((dot, i) => i === index ? { ...dot, status, tooltip } : dot)
    );
  }

  clearProgress(): void {
    this.phase1Progress.set([]);
    this.phase2Progress.set([]);
  }
}
