import { HttpClient } from '@angular/common/http';
import { Injectable, Injector, computed, inject, resource, signal } from '@angular/core';
import { fetchJson } from './utils/fetchJson';
import { Card, StudyDeck, StudyDeckItem } from './parser/types';
import { mapCardDatesFromISOStrings } from './utils/date-mapping.util';

@Injectable({
  providedIn: 'root',
})
export class StudyDeckService {
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);

  readonly selectedSourceId = signal<string | undefined>(undefined);
  readonly currentIndex = signal(0);
  private deckVersion = signal(0);

  readonly deck = resource({
    params: () => ({
      selectedSourceId: this.selectedSourceId(),
      version: this.deckVersion(),
    }),
    loader: async ({ params: { selectedSourceId } }) => {
      if (!selectedSourceId) {
        return null;
      }
      return fetchJson<StudyDeck>(
        this.http,
        `/api/source/${selectedSourceId}/study-deck`
      );
    },
    injector: this.injector,
  });

  readonly currentDeckItem = computed<StudyDeckItem | null>(() => {
    const deckValue = this.deck.value();
    if (!deckValue || deckValue.items.length === 0) {
      return null;
    }
    const index = this.currentIndex();
    if (index >= deckValue.items.length) {
      return null;
    }
    return deckValue.items[index];
  });

  readonly card = resource({
    params: () => ({ currentDeckItem: this.currentDeckItem() }),
    loader: async ({ params: { currentDeckItem } }) => {
      if (!currentDeckItem) {
        return null;
      }
      const card = await fetchJson<Card>(
        this.http,
        `/api/card/${currentDeckItem.cardId}`
      );
      return card ? mapCardDatesFromISOStrings(card) : null;
    },
    injector: this.injector,
  });

  readonly currentPresenter = computed<{ name: string; partnerId: number | null }>(() => {
    const item = this.currentDeckItem();
    if (!item) {
      return { name: 'Myself', partnerId: null };
    }
    return {
      name: item.presenterName,
      partnerId: item.learningPartnerId,
    };
  });

  readonly hasMoreCards = computed(() => {
    const deckValue = this.deck.value();
    if (!deckValue) return false;
    return this.currentIndex() < deckValue.items.length - 1;
  });

  setSelectedSourceId(sourceId: string) {
    this.selectedSourceId.set(sourceId);
    this.currentIndex.set(0);
  }

  advanceToNextCard() {
    const deckValue = this.deck.value();
    if (!deckValue) return;

    const nextIndex = this.currentIndex() + 1;
    if (nextIndex < deckValue.items.length) {
      this.currentIndex.set(nextIndex);
    } else {
      this.refreshDeck();
    }
  }

  refreshDeck() {
    this.currentIndex.set(0);
    this.deckVersion.update((v) => v + 1);
  }
}
