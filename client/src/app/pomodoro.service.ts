import { Injectable, computed, effect, signal } from '@angular/core';

const STORAGE_KEY = 'pomodoroEndsAt';
const DURATION_SECONDS = 25 * 60;

@Injectable({ providedIn: 'root' })
export class PomodoroService {
  private readonly endsAt = signal(this.readDeadline());
  private readonly now = signal(Date.now());
  readonly seconds = computed(() => {
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
    const endsAt = this.endsAt();
    if (endsAt === null || endsAt <= Date.now()) {
      this.start();
    }
  }

  start() {
    const now = Date.now();
    const endsAt = now + DURATION_SECONDS * 1000;
    sessionStorage.setItem(STORAGE_KEY, endsAt.toString());
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
}
