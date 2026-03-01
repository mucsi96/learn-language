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
import { DotProgress } from './shared/types/dot-progress.types';
import {
  runPipeline,
  PipelineResult,
  PipelineTask,
  ProgressUpdater,
} from './utils/processing-pipeline';
import { RateLimitTokenService } from './rate-limit-token.service';

@Injectable({
  providedIn: 'root',
})
export class BulkCardCreationService {
  private readonly http = inject(HttpClient);
  private readonly fsrsGradingService = inject(FsrsGradingService);
  private readonly strategyRegistry = inject(CardTypeRegistry);
  private readonly rateLimitTokenService = inject(RateLimitTokenService);
  readonly progress = signal<DotProgress[]>([]);
  readonly isProcessing = signal(false);
  readonly toolPool = this.rateLimitTokenService.imagePool;

  async createCardsInBulk(
    source: BulkCreationSource,
    cardType: CardType
  ): Promise<PipelineResult> {
    if (this.isProcessing()) {
      throw new Error('Bulk creation already in progress');
    }

    const strategy = this.strategyRegistry.getStrategy(cardType);
    const tasks = this.buildTasks(source, strategy);

    if (tasks.length === 0) {
      return { total: 0, succeeded: 0, failed: 0, errors: [] };
    }

    this.isProcessing.set(true);

    try {
      return await runPipeline(tasks, this.toolPool, this.progress);
    } finally {
      this.isProcessing.set(false);
    }
  }

  clearProgress(): void {
    this.progress.set([]);
  }

  private buildTasks(
    source: BulkCreationSource,
    strategy: CardTypeStrategy
  ): PipelineTask<void>[] {
    switch (source.kind) {
      case 'extractedItems': {
        const itemsToCreate = source.items.filter((item) => !item.exists);
        return itemsToCreate.map((item) => ({
          label: strategy.getItemLabel(item),
          execute: (
            updateProgress: ProgressUpdater,
            toolsRequested: () => void
          ) =>
            this.processFromExtractedItem(
              item,
              source.sourceId,
              source.pageNumber,
              updateProgress,
              toolsRequested,
              strategy
            ),
        }));
      }

      case 'draftCardIds': {
        return source.cardIds.map((cardId) => ({
          label: cardId,
          execute: (
            updateProgress: ProgressUpdater,
            toolsRequested: () => void
          ) =>
            this.processFromDraftCardId(
              cardId,
              updateProgress,
              toolsRequested,
              strategy
            ),
        }));
      }
    }
  }

  private async processFromExtractedItem(
    item: ExtractedItem,
    sourceId: string,
    pageNumber: number,
    updateProgress: ProgressUpdater,
    toolsRequested: () => void,
    strategy: CardTypeStrategy
  ): Promise<void> {
    const label = strategy.getItemLabel(item);

    try {
      updateProgress('in-progress', `${label}: Creating draft...`);

      const draftCardData = strategy.createDraftCardData(item);
      const emptyCard = createEmptyCard();
      const cardPayload = {
        id: item.id,
        sourceId,
        sourcePageNumber: pageNumber,
        data: draftCardData,
        ...this.fsrsGradingService.convertFromFSRSCard(emptyCard),
        readiness: 'DRAFT',
      } satisfies CardCreatePayload;

      await fetchJson(this.http, `/api/card`, {
        body: mapCardDatesToISOStrings(cardPayload),
        method: 'POST',
      });

      await this.enrichAndUpdateCard(
        item.id,
        draftCardData,
        label,
        updateProgress,
        toolsRequested,
        strategy
      );
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error';
      updateProgress('error', `${label}: Error - ${errorMsg}`);
      throw error;
    }
  }

  private async processFromDraftCardId(
    cardId: string,
    updateProgress: ProgressUpdater,
    toolsRequested: () => void,
    strategy: CardTypeStrategy
  ): Promise<void> {
    let label = cardId;

    try {
      updateProgress('in-progress', `${label}: Fetching card...`);

      const card = await fetchJson<Card>(this.http, `/api/card/${cardId}`);
      label = strategy.getCardDisplayLabel(card);
      updateProgress('in-progress', `${label}: Processing...`);

      await this.enrichAndUpdateCard(
        cardId,
        card.data,
        label,
        updateProgress,
        toolsRequested,
        strategy
      );
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error';
      updateProgress('error', `${label}: Error - ${errorMsg}`);
      throw error;
    }
  }

  private async enrichAndUpdateCard(
    cardId: string,
    cardData: CardData,
    label: string,
    updateProgress: ProgressUpdater,
    toolsRequested: () => void,
    strategy: CardTypeStrategy
  ): Promise<void> {
    const progressCallback = (_progress: number, step: string) => {
      updateProgress('in-progress', `${label}: ${step}`);
    };

    const enrichedData = await strategy.createCardData(
      cardData,
      progressCallback,
      toolsRequested
    );

    updateProgress('in-progress', `${label}: Updating card...`);

    await fetchJson(this.http, `/api/card/${cardId}`, {
      body: { data: enrichedData, readiness: 'IN_REVIEW' },
      method: 'PUT',
    });

    updateProgress('completed', `${label}: Done`);
  }
}
