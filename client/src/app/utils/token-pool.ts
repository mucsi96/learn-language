const MINUTE_MS = 60_000;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class TokenPool {
  private activeTokens = 0;
  private distributedThisMinute = 0;
  private minuteWindowStart = 0;
  private readonly waitingResolvers: (() => void)[] = [];

  constructor(
    private readonly maxConcurrent: number,
    private readonly maxPerMinute: number
  ) {}

  async acquire(): Promise<void> {
    while (true) {
      this.refreshMinuteWindow();

      if (
        this.activeTokens < this.maxConcurrent &&
        this.distributedThisMinute < this.maxPerMinute
      ) {
        this.activeTokens++;
        this.distributedThisMinute++;
        return;
      }

      if (this.distributedThisMinute >= this.maxPerMinute) {
        const waitTime = MINUTE_MS - (Date.now() - this.minuteWindowStart);
        if (waitTime > 0) {
          await delay(waitTime);
        }
        continue;
      }

      await new Promise<void>((resolve) => {
        this.waitingResolvers.push(resolve);
      });
    }
  }

  release(): void {
    this.activeTokens--;
    const resolver = this.waitingResolvers.shift();
    if (resolver) {
      resolver();
    }
  }

  async waitForAvailability(): Promise<void> {
    while (!this.isAvailable()) {
      if (this.distributedThisMinute >= this.maxPerMinute) {
        const waitTime = MINUTE_MS - (Date.now() - this.minuteWindowStart);
        if (waitTime > 0) {
          await delay(waitTime);
        }
        continue;
      }

      await new Promise<void>((resolve) => {
        this.waitingResolvers.push(resolve);
      });
    }
  }

  private isAvailable(): boolean {
    this.refreshMinuteWindow();
    return (
      this.activeTokens < this.maxConcurrent &&
      this.distributedThisMinute < this.maxPerMinute
    );
  }

  private refreshMinuteWindow(): void {
    const now = Date.now();
    if (now - this.minuteWindowStart >= MINUTE_MS) {
      this.minuteWindowStart = now;
      this.distributedThisMinute = 0;
    }
  }
}
