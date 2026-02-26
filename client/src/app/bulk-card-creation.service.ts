import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CardCreatePayload } from './parser/types';
import { fetchJson } from './utils/fetchJson';
import { createEmptyCard } from 'ts-fsrs';
import { FsrsGradingService } from './fsrs-grading.service';
import { mapCardDatesToISOStrings } from './utils/date-mapping.util';
import { CardTypeRegistry } from './cardTypes/card-type.registry';
import {
  CardCreationRequest,
  CardType,
  CardTypeStrategy,
  ExtractedItem,
} from './parser/types';
import { DotProgress, DotStatus } from './shared/types/dot-progress.types';
import {
  processTasksWithRateLimit,
  summarizeResults,
  BatchResult,
} from './utils/task-processor';

@Injectable({
  providedIn: 'root',
})
export class BulkCardCreationService {
  private readonly http = inject(HttpClient);
  private readonly fsrsGradingService = inject(FsrsGradingService);
  private readonly strategyRegistry = inject(CardTypeRegistry);
  readonly progress = signal<DotProgress[]>([]);
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

    this.progress.set(itemsToCreate.map(item => ({
      label: strategy.getItemLabel(item),
      status: 'pending' as const,
      tooltip: `${strategy.getItemLabel(item)}: Queued`,
    })));

    const tasks = itemsToCreate.map(
      (item, index) => () => {
        const request: CardCreationRequest = { item, sourceId, pageNumber, cardType };
        return this.createSingleCard(request, index, strategy);
      }
    );

    const results = await processTasksWithRateLimit(tasks, null);

    this.isCreating.set(false);

    return summarizeResults(results);
  }

  private async createSingleCard(
    request: CardCreationRequest,
    progressIndex: number,
    strategy: CardTypeStrategy
  ): Promise<void> {
    const { item, sourceId, pageNumber } = request;
    const label = strategy.getItemLabel(item);

    try {
      this.updateProgress(progressIndex, 'in-progress', `${label}: Translating...`);

      const progressCallback = (_progress: number, step: string) => {
        this.updateProgress(progressIndex, 'in-progress', `${label}: ${step}`);
      };

      const cardData = await strategy.createCardData(request, progressCallback);

      this.updateProgress(progressIndex, 'in-progress', `${label}: Creating card...`);

      const emptyCard = createEmptyCard();
      const cardWithFSRS = {
        id: item.id,
        sourceId,
        sourcePageNumber: pageNumber,
        data: cardData,
        ...this.fsrsGradingService.convertFromFSRSCard(emptyCard),
        readiness: 'DRAFT'
      } satisfies CardCreatePayload;

      await fetchJson(this.http, `/api/card`, {
        body: mapCardDatesToISOStrings(cardWithFSRS),
        method: 'POST',
      });

      this.updateProgress(progressIndex, 'completed', `${label}: Done`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.updateProgress(progressIndex, 'error', `${label}: Error - ${errorMsg}`);
      throw error;
    }
  }

  private updateProgress(index: number, status: DotStatus, tooltip: string): void {
    this.progress.update(dots =>
      dots.map((dot, i) => i === index ? { ...dot, status, tooltip } : dot)
    );
  }

  clearProgress(): void {
    this.progress.set([]);
  }
}
