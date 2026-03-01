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

  const results: PromiseSettledResult<T>[] = [];

  for (const task of tasks) {
    await tokenPool.waitForAvailability();
    const result = await task().then(
      (value): PromiseSettledResult<T> => ({ status: 'fulfilled', value }),
      (reason): PromiseSettledResult<T> => ({ status: 'rejected', reason })
    );
    results.push(result);
  }

  return results;
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
