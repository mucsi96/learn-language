import { signal } from '@angular/core';

const MINUTE_MS = 60_000;
const CONCURRENT_POLL_MS = 200;

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

  constructor(
    readonly maxPerMinute: number,
    readonly maxConcurrent: number = 0
  ) {}

  async acquire(): Promise<void> {
    this._waitingCount.update((n) => n + 1);
    try {
      while (true) {
        this.refreshMinuteWindow();

        const withinMinuteLimit =
          this.distributedThisMinute < this.maxPerMinute;
        const withinConcurrentLimit =
          this.maxConcurrent === 0 ||
          this._activeCount() < this.maxConcurrent;

        if (withinMinuteLimit && withinConcurrentLimit) {
          this.distributedThisMinute++;
          this._usedThisMinute.set(this.distributedThisMinute);
          this._activeCount.update((n) => n + 1);
          return;
        }

        if (!withinMinuteLimit) {
          const waitTime = MINUTE_MS - (Date.now() - this.minuteWindowStart);
          if (waitTime > 0) {
            await delay(waitTime);
          }
        } else {
          await delay(CONCURRENT_POLL_MS);
        }
      }
    } finally {
      this._waitingCount.update((n) => n - 1);
    }
  }

  release(): void {
    this._activeCount.update((n) => n - 1);
  }

  isAvailable(): boolean {
    this.refreshMinuteWindow();
    const withinMinuteLimit = this.distributedThisMinute < this.maxPerMinute;
    const withinConcurrentLimit =
      this.maxConcurrent === 0 || this._activeCount() < this.maxConcurrent;
    return withinMinuteLimit && withinConcurrentLimit;
  }

  async waitForAvailability(): Promise<void> {
    while (!this.isAvailable()) {
      if (this.distributedThisMinute >= this.maxPerMinute) {
        const waitTime = MINUTE_MS - (Date.now() - this.minuteWindowStart);
        if (waitTime > 0) {
          await delay(waitTime);
        }
      } else {
        await delay(CONCURRENT_POLL_MS);
      }
    }
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
