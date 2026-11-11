import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, resource, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { fetchJson } from './utils/fetchJson';

const DURATION_SECONDS = 25 * 60;

interface PomodoroState {
  endsAt: number | null;
  remainingMs: number | null;
  version: number;
}

@Injectable({ providedIn: 'root' })
export class PomodoroService {
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);
  private readonly state = resource({ loader: () => this.fetchState() });
  readonly busy = signal(false);
  readonly loadFailed = computed(() => !!this.state.error());
  private readonly current = computed(() => this.state.hasValue() ? this.state.value() : null);
  readonly paused = computed(() => this.current()?.remainingMs != null);
  private readonly now = signal(Date.now());
  readonly seconds = computed(() => {
    const state = this.current();
    if (!state) return null;
    if (state.remainingMs !== null) return Math.ceil(state.remainingMs / 1000);
    return state.endsAt === null ? null : Math.max(0, Math.ceil((state.endsAt - this.now()) / 1000));
  });
  readonly progress = computed(() => {
    const seconds = this.seconds();
    return seconds === null ? null : Math.max(0, (1 - seconds / DURATION_SECONDS) * 100);
  });

  constructor() {
    effect((onCleanup) => {
      if (this.current()?.endsAt == null) return;
      this.now.set(Date.now());
      const interval = setInterval(() => this.now.set(Date.now()), 1000);
      onCleanup(() => clearInterval(interval));
    });
  }

  reload() {
    this.state.reload();
  }

  startIfInactive() {
    return this.update(state => state.remainingMs !== null || (state.endsAt !== null && state.endsAt > Date.now())
      ? state : this.runningState(state, DURATION_SECONDS * 1000));
  }

  start() {
    return this.update(state => this.runningState(state, DURATION_SECONDS * 1000));
  }

  pause() {
    return this.update(state => {
      const now = Date.now();
      if (state.endsAt === null || state.endsAt <= now) return state;
      return { ...state, endsAt: null, remainingMs: state.endsAt - now };
    });
  }

  resume() {
    return this.update(state => state.remainingMs === null ? state : this.runningState(state, state.remainingMs));
  }

  private runningState(state: PomodoroState, remainingMs: number): PomodoroState {
    return { ...state, endsAt: Date.now() + remainingMs, remainingMs: null };
  }

  private fetchState() {
    return fetchJson<PomodoroState>(this.http, '/api/pomodoro');
  }

  private async update(transform: (state: PomodoroState) => PomodoroState) {
    if (this.busy()) throw new Error('A Pomodoro update is already in progress');
    this.busy.set(true);
    try {
      const current = await this.fetchState();
      const next = transform(current);
      const saved = next === current ? current : await fetchJson<PomodoroState>(this.http, '/api/pomodoro', {
        method: 'PUT', body: next,
      });
      this.now.set(Date.now());
      this.state.set(saved);
    } catch (error) {
      this.snackBar.open('Could not save Pomodoro. Please retry.', 'Dismiss', { duration: 5000 });
      throw error;
    } finally {
      this.busy.set(false);
    }
  }
}
