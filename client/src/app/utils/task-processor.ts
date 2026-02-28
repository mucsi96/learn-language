import { TokenPool } from './token-pool';

export interface BatchResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: string[];
}

export const processTasksWithRateLimit = async <T>(
  tasks: ReadonlyArray<() => Promise<T>>,
  tokenPool: TokenPool
): Promise<PromiseSettledResult<T>[]> => {
  if (tasks.length === 0) {
    return [];
  }

  const execute = async (
    task: () => Promise<T>
  ): Promise<PromiseSettledResult<T>> => {
    await tokenPool.waitForAvailability();
    try {
      const value = await task();
      return { status: 'fulfilled' as const, value };
    } catch (reason: unknown) {
      return { status: 'rejected' as const, reason };
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
