import { Injectable, computed, effect, signal } from '@angular/core';

const STORAGE_KEY = 'pomodoroEndsAt';

@Injectable({ providedIn: 'root' })
export class PomodoroService {
  private readonly endsAt = signal(this.readDeadline());
  private readonly now = signal(Date.now());
  readonly seconds = computed(() => {
    const endsAt = this.endsAt();
    return endsAt === null ? null : Math.max(0, Math.ceil((endsAt - this.now()) / 1000));
  });
  readonly time = computed(() => {
    const seconds = this.seconds();
    if (seconds === null) return null;
    const minutesPart = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secondsPart = (seconds % 60).toString().padStart(2, '0');
    return `${minutesPart}:${secondsPart}`;
  });

  constructor() {
    effect((onCleanup) => {
      if (this.endsAt() === null) return;
      const interval = setInterval(() => this.now.set(Date.now()), 1000);
      onCleanup(() => clearInterval(interval));
    });
  }

  start() {
    const now = Date.now();
    const endsAt = now + 25 * 60_000;
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
