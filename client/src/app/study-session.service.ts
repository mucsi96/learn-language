import { HttpClient } from '@angular/common/http';
import { Injectable, Injector, computed, inject, resource, signal } from '@angular/core';
import { fetchJson } from './utils/fetchJson';
import { StudySession, StudySessionCard } from './parser/types';
import { mapCardDatesFromISOStrings } from './utils/date-mapping.util';

@Injectable({
  providedIn: 'root',
})
export class StudySessionService {
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);

  readonly sessionId = signal<string | undefined>(undefined);
  private sessionVersion = signal(0);

  readonly session = resource({
    params: () => ({
      sessionId: this.sessionId(),
      version: this.sessionVersion(),
    }),
    loader: async ({ params: { sessionId } }) => {
      if (!sessionId) {
        return null;
      }
      return fetchJson<StudySession>(this.http, `/api/study-session/${sessionId}`);
    },
    injector: this.injector,
  });

  readonly currentCard = resource({
    params: () => ({
      sessionId: this.sessionId(),
      version: this.sessionVersion(),
    }),
    loader: async ({ params: { sessionId } }) => {
      if (!sessionId) {
        return null;
      }
      const result = await fetchJson<StudySessionCard>(
        this.http,
        `/api/study-session/${sessionId}/current-card`
      );
      if (result && result.card) {
        result.card = mapCardDatesFromISOStrings(result.card);
      }
      return result;
    },
    injector: this.injector,
  });

  readonly currentPresenter = computed<{ name: string; partnerId: number | null }>(() => {
    const cardData = this.currentCard.value();
    if (!cardData) {
      return { name: 'Myself', partnerId: null };
    }
    return {
      name: cardData.presenterName,
      partnerId: cardData.learningPartnerId,
    };
  });

  readonly stats = computed(() => {
    const cardData = this.currentCard.value();
    if (!cardData) {
      return { totalCards: 0, remainingCards: 0, position: 0 };
    }
    return {
      totalCards: cardData.totalCards,
      remainingCards: cardData.remainingCards,
      position: cardData.position,
    };
  });

  async createSession(sourceId: string): Promise<StudySession | null> {
    const session = await fetchJson<StudySession>(
      this.http,
      `/api/source/${sourceId}/study-session`,
      { method: 'POST' }
    );
    if (session) {
      this.sessionId.set(session.sessionId);
    }
    return session;
  }

  async markCardCompleted(cardId: string): Promise<void> {
    const sessionId = this.sessionId();
    if (!sessionId) return;

    await fetchJson<StudySession>(
      this.http,
      `/api/study-session/${sessionId}/card/${cardId}/complete`,
      { method: 'POST' }
    );

    this.sessionVersion.update((v) => v + 1);
  }

  refreshSession() {
    this.sessionVersion.update((v) => v + 1);
  }

  clearSession() {
    this.sessionId.set(undefined);
  }
}
