import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { createEmptyCard } from 'ts-fsrs';
import { ENVIRONMENT_CONFIG } from './environment/environment.config';
import { FsrsGradingService } from './fsrs-grading.service';
import { fetchJson } from './utils/fetchJson';
import { mapCardDatesToISOStrings } from './utils/date-mapping.util';
import {
  CardCreatePayload,
  CoverageResponse,
  GenerateCardsResponse,
  SimpleCardSuggestion,
} from './parser/types';
import { CardReadiness } from './shared/state/card-readiness';

const CARD_GENERATION_OPERATION = 'card_generation';
const CARD_CREATION_CHUNK_SIZE = 10;

@Injectable({
  providedIn: 'root',
})
export class PromptSourceService {
  private readonly http = inject(HttpClient);
  private readonly environment = inject(ENVIRONMENT_CONFIG);
  private readonly fsrsGradingService = inject(FsrsGradingService);

  readonly primaryModel =
    this.environment.primaryModelByOperation[CARD_GENERATION_OPERATION];

  async generateCards(
    sourceId: string,
    prompt: string,
    count: number
  ): Promise<SimpleCardSuggestion[]> {
    const response = await fetchJson<GenerateCardsResponse>(
      this.http,
      `/api/source/${sourceId}/generate-cards`,
      {
        method: 'POST',
        body: { prompt, count },
      }
    );
    return response.cards;
  }

  async getCoverage(sourceId: string): Promise<CoverageResponse> {
    return fetchJson<CoverageResponse>(
      this.http,
      `/api/source/${sourceId}/coverage`
    );
  }

  async createCards(
    sourceId: string,
    suggestions: SimpleCardSuggestion[],
    readiness: CardReadiness
  ): Promise<SimpleCardSuggestion[]> {
    const chunks = Array.from(
      { length: Math.ceil(suggestions.length / CARD_CREATION_CHUNK_SIZE) },
      (_, index) =>
        suggestions.slice(
          index * CARD_CREATION_CHUNK_SIZE,
          (index + 1) * CARD_CREATION_CHUNK_SIZE
        )
    );

    const results = await chunks.reduce(
      async (previous, chunk) => {
        const settled = await previous;
        const chunkResults = await Promise.allSettled(
          chunk.map((suggestion) => this.createCard(sourceId, suggestion, readiness))
        );
        return [...settled, ...chunkResults];
      },
      Promise.resolve([] as PromiseSettledResult<unknown>[])
    );

    return suggestions.filter(
      (_, index) => results[index].status === 'rejected'
    );
  }

  private createCard(
    sourceId: string,
    suggestion: SimpleCardSuggestion,
    readiness: CardReadiness
  ): Promise<unknown> {
    const emptyCard = createEmptyCard();
    const cardPayload = {
      id: `${sourceId}-${crypto.randomUUID()}`,
      sourceId,
      sourcePageNumber: 1,
      type: 'simple' as const,
      data: {
        frontText: suggestion.frontText,
        backText: suggestion.backText,
        ...(suggestion.category ? { category: suggestion.category } : {}),
      },
      ...this.fsrsGradingService.convertFromFSRSCard(emptyCard),
      readiness,
    } satisfies CardCreatePayload;

    return fetchJson(this.http, `/api/card`, {
      body: mapCardDatesToISOStrings(cardPayload),
      method: 'POST',
    });
  }
}
