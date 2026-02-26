import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Card, CardCreatePayload, CardData } from './parser/types';
import { fetchJson } from './utils/fetchJson';
import { createEmptyCard } from 'ts-fsrs';
import { FsrsGradingService } from './fsrs-grading.service';
import { mapCardDatesToISOStrings } from './utils/date-mapping.util';
import { CardTypeRegistry } from './cardTypes/card-type.registry';
import {
  BulkCreationSource,
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
    source: BulkCreationSource,
    cardType: CardType
  ): Promise<BatchResult> {
    if (this.isCreating()) {
      throw new Error('Bulk creation already in progress');
    }

    const strategy = this.strategyRegistry.getStrategy(cardType);

    switch (source.kind) {
      case 'extractedItems': {
        const itemsToCreate = source.items.filter(item => !item.exists);

        if (itemsToCreate.length === 0) {
          return { total: 0, succeeded: 0, failed: 0, errors: [] };
        }

        this.isCreating.set(true);

        try {
          this.progress.set(itemsToCreate.map(item => ({
            label: strategy.getItemLabel(item),
            status: 'pending' as const,
            tooltip: `${strategy.getItemLabel(item)}: Queued`,
          })));

          const tasks = itemsToCreate.map(
            (item, index) => () =>
              this.processFromExtractedItem(item, source.sourceId, source.pageNumber, index, strategy)
          );

          const results = await processTasksWithRateLimit(tasks, null);
          return summarizeResults(results);
        } finally {
          this.isCreating.set(false);
        }
      }

      case 'draftCardIds': {
        if (source.cardIds.length === 0) {
          return { total: 0, succeeded: 0, failed: 0, errors: [] };
        }

        this.isCreating.set(true);

        try {
          this.progress.set(source.cardIds.map(id => ({
            label: id,
            status: 'pending' as const,
            tooltip: `${id}: Queued`,
          })));

          const tasks = source.cardIds.map(
            (cardId, index) => () =>
              this.processFromDraftCardId(cardId, index, strategy)
          );

          const results = await processTasksWithRateLimit(tasks, null);
          return summarizeResults(results);
        } finally {
          this.isCreating.set(false);
        }
      }
    }
  }

  private async processFromExtractedItem(
    item: ExtractedItem,
    sourceId: string,
    pageNumber: number,
    progressIndex: number,
    strategy: CardTypeStrategy
  ): Promise<void> {
    const label = strategy.getItemLabel(item);

    try {
      this.updateProgress(progressIndex, 'in-progress', `${label}: Creating draft...`);

      const draftCardData = strategy.createDraftCardData(item);
      const emptyCard = createEmptyCard();
      const cardPayload = {
        id: item.id,
        sourceId,
        sourcePageNumber: pageNumber,
        data: draftCardData,
        ...this.fsrsGradingService.convertFromFSRSCard(emptyCard),
        readiness: 'DRAFT'
      } satisfies CardCreatePayload;

      await fetchJson(this.http, `/api/card`, {
        body: mapCardDatesToISOStrings(cardPayload),
        method: 'POST',
      });

      await this.enrichAndUpdateCard(item.id, draftCardData, label, progressIndex, strategy);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.updateProgress(progressIndex, 'error', `${label}: Error - ${errorMsg}`);
      throw error;
    }
  }

  private async processFromDraftCardId(
    cardId: string,
    progressIndex: number,
    strategy: CardTypeStrategy
  ): Promise<void> {
    let label = cardId;

    try {
      this.updateProgress(progressIndex, 'in-progress', `${label}: Fetching card...`);

      const card = await fetchJson<Card>(this.http, `/api/card/${cardId}`);
      label = strategy.getCardDisplayLabel(card);
      this.updateProgress(progressIndex, 'in-progress', `${label}: Processing...`);

      await this.enrichAndUpdateCard(cardId, card.data, label, progressIndex, strategy);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.updateProgress(progressIndex, 'error', `${label}: Error - ${errorMsg}`);
      throw error;
    }
  }

  private async enrichAndUpdateCard(
    cardId: string,
    cardData: CardData,
    label: string,
    progressIndex: number,
    strategy: CardTypeStrategy
  ): Promise<void> {
    const progressCallback = (_progress: number, step: string) => {
      this.updateProgress(progressIndex, 'in-progress', `${label}: ${step}`);
    };

    const enrichedData = await strategy.createCardData(cardData, progressCallback);

    this.updateProgress(progressIndex, 'in-progress', `${label}: Updating card...`);

    await fetchJson(this.http, `/api/card/${cardId}`, {
      body: { data: enrichedData, readiness: 'IN_REVIEW' },
      method: 'PUT',
    });

    this.updateProgress(progressIndex, 'completed', `${label}: Done`);
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
