import { signal } from '@angular/core';

const MINUTE_MS = 60_000;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class ToolPool {
  private distributedThisMinute = 0;
  private minuteWindowStart = 0;
  private readonly _activeCount = signal(0);
  private readonly _waitingCount = signal(0);
  private readonly _usedThisMinute = signal(0);

  readonly activeCount = this._activeCount.asReadonly();
  readonly waitingCount = this._waitingCount.asReadonly();
  readonly usedThisMinute = this._usedThisMinute.asReadonly();

  constructor(readonly maxPerMinute: number) {}

  async acquire(): Promise<void> {
    this._waitingCount.update((n) => n + 1);
    try {
      while (true) {
        this.refreshMinuteWindow();

        if (this.distributedThisMinute < this.maxPerMinute) {
          this.distributedThisMinute++;
          this._usedThisMinute.set(this.distributedThisMinute);
          this._activeCount.update((n) => n + 1);
          return;
        }

        const waitTime = MINUTE_MS - (Date.now() - this.minuteWindowStart);
        if (waitTime > 0) {
          await delay(waitTime);
        }
      }
    } finally {
      this._waitingCount.update((n) => n - 1);
    }
  }

  release(): void {
    this._activeCount.update((n) => n - 1);
  }

  private refreshMinuteWindow(): void {
    const now = Date.now();
    if (now - this.minuteWindowStart >= MINUTE_MS) {
      this.minuteWindowStart = now;
      this.distributedThisMinute = 0;
      this._usedThisMinute.set(0);
    }
  }
}
