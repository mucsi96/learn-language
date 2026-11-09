import { Injectable, computed, effect, signal } from '@angular/core';

const STORAGE_KEY = 'pomodoroEndsAt';
const PAUSED_STORAGE_KEY = 'pomodoroRemainingMs';
const DURATION_SECONDS = 25 * 60;

@Injectable({ providedIn: 'root' })
export class PomodoroService {
  private readonly endsAt = signal(this.readDeadline());
  private readonly remainingMs = signal(this.readRemainingMs());
  readonly paused = computed(() => this.remainingMs() !== null);
  private readonly now = signal(Date.now());
  readonly seconds = computed(() => {
    const remainingMs = this.remainingMs();
    if (remainingMs !== null) return Math.ceil(remainingMs / 1000);
    const endsAt = this.endsAt();
    return endsAt === null ? null : Math.max(0, Math.ceil((endsAt - this.now()) / 1000));
  });
  readonly progress = computed(() => {
    const seconds = this.seconds();
    return seconds === null ? null : Math.max(0, (1 - seconds / DURATION_SECONDS) * 100);
  });

  constructor() {
    effect((onCleanup) => {
      if (this.endsAt() === null) return;
      const interval = setInterval(() => this.now.set(Date.now()), 1000);
      onCleanup(() => clearInterval(interval));
    });
  }

  startIfInactive() {
    if (this.paused()) return;
    const endsAt = this.endsAt();
    if (endsAt === null || endsAt <= Date.now()) {
      this.start();
    }
  }

  start() {
    this.setDeadline(DURATION_SECONDS * 1000);
  }

  pause() {
    const endsAt = this.endsAt();
    if (endsAt === null || this.paused()) return;
    const now = Date.now();
    const remainingMs = endsAt - now;
    this.now.set(now);
    if (remainingMs <= 0) return;
    sessionStorage.setItem(PAUSED_STORAGE_KEY, remainingMs.toString());
    sessionStorage.removeItem(STORAGE_KEY);
    this.remainingMs.set(remainingMs);
    this.endsAt.set(null);
  }

  resume() {
    const remainingMs = this.remainingMs();
    if (remainingMs !== null) this.setDeadline(remainingMs);
  }

  private setDeadline(remainingMs: number) {
    const now = Date.now();
    const endsAt = now + remainingMs;
    sessionStorage.setItem(STORAGE_KEY, endsAt.toString());
    sessionStorage.removeItem(PAUSED_STORAGE_KEY);
    this.remainingMs.set(null);
    this.now.set(now);
    this.endsAt.set(endsAt);
  }

  private readDeadline(): number | null {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === null) return null;
    const endsAt = Number(stored);
    if (!Number.isFinite(endsAt) || endsAt <= 0) {
      throw new Error('Invalid stored Pomodoro deadline');
    }
    return endsAt;
  }

  private readRemainingMs(): number | null {
    const stored = sessionStorage.getItem(PAUSED_STORAGE_KEY);
    if (stored === null) return null;
    const remainingMs = Number(stored);
    if (!Number.isFinite(remainingMs) || remainingMs <= 0 || remainingMs > DURATION_SECONDS * 1000) {
      throw new Error('Invalid stored Pomodoro remaining time');
    }
    return remainingMs;
  }
}
