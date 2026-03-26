import { HttpClient } from '@angular/common/http';
import { Injectable, Injector, computed, inject, resource, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { fetchJson } from './utils/fetchJson';
import { SessionStats, StudySession, StudySessionCard } from './parser/types';
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
        `/api/source/${sourceId}/study-session/current-card`
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
    try {
      const session = await fetchJson<StudySession>(
        this.http,
        `/api/source/${sourceId}/study-session`
      );
      const exists = session !== null;
      this.sourceId.set(sourceId);
      this.hasExistingSession.set(exists);
      return exists;
    } catch {
      this.sourceId.set(sourceId);
      this.hasExistingSession.set(false);
      return false;
    }
  }

  async createSession(sourceId: string): Promise<StudySession | null> {
    const session = await fetchJson<StudySession>(
      this.http,
      `/api/source/${sourceId}/study-session`,
      { method: 'POST' }
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

  async fetchSessionStats(sourceId: string): Promise<SessionStats | null> {
    return await fetchJson<SessionStats>(
      this.http,
      `/api/source/${sourceId}/study-session/stats`
    );
  }

  async downloadStruggledCardsPdf(sourceId: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.get(`/api/source/${sourceId}/study-session/struggled-cards.pdf`, {
        responseType: 'blob',
      })
    );
    const blob = response as Blob;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'struggled-cards.pdf';
    link.click();
    URL.revokeObjectURL(url);
  }

  clearSession() {
    this.sourceId.set(undefined);
    this.hasSession.set(false);
    this.hasExistingSession.set(false);
  }
}
