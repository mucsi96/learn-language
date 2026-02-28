export interface BatchResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: string[];
}

export interface RateLimitConfig {
  readonly maxPerMinute: number;
  readonly maxConcurrent: number;
}

class TokenPool {
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
      const now = Date.now();

      if (now - this.minuteWindowStart >= 60_000) {
        this.minuteWindowStart = now;
        this.distributedThisMinute = 0;
      }

      if (
        this.activeTokens < this.maxConcurrent &&
        this.distributedThisMinute < this.maxPerMinute
      ) {
        this.activeTokens++;
        this.distributedThisMinute++;
        return;
      }

      if (this.distributedThisMinute >= this.maxPerMinute) {
        const waitTime = 60_000 - (now - this.minuteWindowStart);
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
}

export const processTasksWithRateLimit = async <T>(
  tasks: ReadonlyArray<() => Promise<T>>,
  config: RateLimitConfig
): Promise<PromiseSettledResult<T>[]> => {
  if (tasks.length === 0) {
    return [];
  }

  const pool = new TokenPool(config.maxConcurrent, config.maxPerMinute);

  const execute = async (
    task: () => Promise<T>
  ): Promise<PromiseSettledResult<T>> => {
    await pool.acquire();
    try {
      const value = await task();
      return { status: 'fulfilled' as const, value };
    } catch (reason: unknown) {
      return { status: 'rejected' as const, reason };
    } finally {
      pool.release();
    }
  };

  return Promise.all(tasks.map((task) => execute(task)));
};

export const summarizeResults = <T>(
  results: ReadonlyArray<PromiseSettledResult<T>>
): BatchResult => ({
  total: results.length,
  succeeded: results.filter((r) => r.status === 'fulfilled').length,
  failed: results.filter((r) => r.status === 'rejected').length,
  errors: results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map((r) => r.reason?.message || 'Unknown error'),
});

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
