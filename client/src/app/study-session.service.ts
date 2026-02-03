import { HttpClient } from '@angular/common/http';
import { Injectable, Injector, computed, inject, resource, signal } from '@angular/core';
import { fetchJson } from './utils/fetchJson';
import { StudySession, StudySessionCard } from './parser/types';
import { mapCardDatesFromISOStrings } from './utils/date-mapping.util';
import { DueCardsService } from './due-cards.service';

@Injectable({
  providedIn: 'root',
})
export class StudySessionService {
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);
  private readonly dueCardsService = inject(DueCardsService);

  readonly sourceId = signal<string | undefined>(undefined);
  readonly hasSession = signal(false);
  readonly hasExistingSession = signal(false);
  private sessionVersion = signal(0);

  private readonly timezoneHeaders = {
    'X-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  readonly currentCard = resource({
    params: () => ({
      sourceId: this.sourceId(),
      hasSession: this.hasSession(),
      version: this.sessionVersion(),
    }),
    loader: async ({ params: { sourceId, hasSession } }) => {
      if (!sourceId || !hasSession) {
        return null;
      }
      const result = await fetchJson<StudySessionCard>(
        this.http,
        `/api/source/${sourceId}/study-session/current-card`,
        { headers: this.timezoneHeaders }
      );
      if (result && result.card) {
        result.card = mapCardDatesFromISOStrings(result.card);
      }
      return result;
    },
    injector: this.injector,
  });

  readonly currentTurn = computed<{ name: string; partnerId: number | null }>(() => {
    const cardData = this.currentCard.value();
    if (!cardData) {
      return { name: 'Myself', partnerId: null };
    }
    return {
      name: cardData.turnName,
      partnerId: cardData.learningPartnerId,
    };
  });

  async checkExistingSession(sourceId: string): Promise<boolean> {
    const session = await fetchJson<StudySession>(
      this.http,
      `/api/source/${sourceId}/study-session`,
      { headers: this.timezoneHeaders }
    );
    const exists = session !== null;
    this.sourceId.set(sourceId);
    this.hasExistingSession.set(exists);
    return exists;
  }

  async createSession(sourceId: string): Promise<StudySession | null> {
    const session = await fetchJson<StudySession>(
      this.http,
      `/api/source/${sourceId}/study-session`,
      { method: 'POST', headers: this.timezoneHeaders }
    );
    if (session) {
      this.sourceId.set(sourceId);
      this.hasSession.set(true);
    }
    return session;
  }

  refreshSession() {
    this.sessionVersion.update((v) => v + 1);
    this.dueCardsService.refetchDueCounts();
  }

  clearSession() {
    this.sourceId.set(undefined);
    this.hasSession.set(false);
    this.hasExistingSession.set(false);
  }
}
