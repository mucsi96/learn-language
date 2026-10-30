import { HttpClient } from '@angular/common/http';
import { Injectable, Injector, computed, effect, inject, resource, signal } from '@angular/core';
import { SourcesService } from './sources.service';
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
  private readonly sourcesService = inject(SourcesService);

  readonly sourceId = signal<string | undefined>(undefined);
  readonly hasSession = signal(false);
  readonly hasExistingSession = signal(false);
  readonly restartControl = signal<{
    disabled: () => boolean;
    start: () => Promise<void>;
  } | null>(null);
  private readonly pomodoroEndsAt = signal<number | null>(null);
  private readonly now = signal(Date.now());
  readonly pomodoroSeconds = computed(() => {
    const endsAt = this.pomodoroEndsAt();
    return endsAt === null ? null : Math.max(0, Math.ceil((endsAt - this.now()) / 1000));
  });
  readonly pomodoroTime = computed(() => {
    const seconds = this.pomodoroSeconds();
    if (seconds === null) return null;
    const minutesPart = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secondsPart = (seconds % 60).toString().padStart(2, '0');
    return `${minutesPart}:${secondsPart}`;
  });

  constructor() {
    effect((onCleanup) => {
      if (this.pomodoroEndsAt() === null) return;
      const interval = setInterval(() => this.now.set(Date.now()), 1000);
      onCleanup(() => clearInterval(interval));
    });
  }

  readonly currentCard = resource({
    params: () => ({
      sourceId: this.sourceId(),
      hasSession: this.hasSession(),
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

  async createSession(sourceId: string, restart = false): Promise<StudySession | null> {
    const session = await fetchJson<StudySession>(
      this.http,
      `/api/source/${sourceId}/study-session${restart ? '/restart' : ''}`,
      { method: 'POST' }
    );
    if (session) {
      this.sourceId.set(sourceId);
      this.now.set(Date.now());
      this.pomodoroEndsAt.set(session.pomodoroEndsAt);
      this.hasSession.set(true);
      this.refreshSession();
    }
    return session;
  }

  async skipCard(sourceId: string, cardId: string): Promise<void> {
    await fetchJson(
      this.http,
      `/api/source/${sourceId}/study-session/skip-card/${cardId}`,
      { method: 'POST' }
    );
  }

  refreshSession() {
    this.currentCard.reload();
    this.dueCardsService.refetchDueCounts();
    this.sourcesService.refetchSources();
  }

  async fetchSessionStats(sourceId: string): Promise<SessionStats | null> {
    return await fetchJson<SessionStats>(
      this.http,
      `/api/source/${sourceId}/study-session/stats`
    );
  }

  async downloadStruggledCardsPdf(sourceId: string): Promise<void> {
    const blob = await firstValueFrom(
      this.http.get(`/api/source/${sourceId}/study-session/struggled-cards.pdf`, {
        responseType: 'blob',
      })
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'struggled-cards.pdf';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  clearSession() {
    this.pomodoroEndsAt.set(null);
    this.sourceId.set(undefined);
    this.hasSession.set(false);
    this.hasExistingSession.set(false);
  }

  async deleteAllSessions(): Promise<void> {
    await fetchJson(this.http, '/api/study-sessions', { method: 'DELETE' });
    this.clearSession();
    this.dueCardsService.refetchDueCounts();
    this.sourcesService.refetchSources();
  }
}
