import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { newCardScheduling } from './shared/state/fsrs-scheduler';
import { fetchJson } from './utils/fetchJson';
import { mapCardDatesToISOStrings } from './utils/date-mapping.util';
import { CardCreatePayload } from './parser/types';
import { JsonCardSuggestion } from './cardTypes/json-card-import';
import { CardReadiness } from './shared/state/card-readiness';

const CARD_CREATION_CHUNK_SIZE = 10;

@Injectable({
  providedIn: 'root',
})
export class JsonSourceService {
  private readonly http = inject(HttpClient);

  async createCards(
    sourceId: string,
    suggestions: JsonCardSuggestion[],
    readiness: CardReadiness
  ): Promise<JsonCardSuggestion[]> {
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
    suggestion: JsonCardSuggestion,
    readiness: CardReadiness
  ): Promise<unknown> {
    const cardPayload = {
      id: suggestion.id,
      sourceId,
      sourcePageNumber: 1,
      type: suggestion.type,
      data: suggestion.data,
      ...newCardScheduling(suggestion.id),
      readiness,
    } satisfies CardCreatePayload;

    return fetchJson(this.http, `/api/card`, {
      body: mapCardDatesToISOStrings(cardPayload),
      method: 'POST',
    });
  }
}
