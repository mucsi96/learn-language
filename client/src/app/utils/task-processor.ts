export interface BatchResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: string[];
}

export const processTasksWithRateLimit = async <T>(
  tasks: ReadonlyArray<() => Promise<T>>,
  maxPerMinute: number
): Promise<PromiseSettledResult<T>[]> => {
  if (tasks.length === 0) {
    return [];
  }

  const intervalMs = 60_000 / maxPerMinute;

  const { inFlight } = await tasks.reduce<
    Promise<{
      inFlight: Promise<PromiseSettledResult<T>>[];
      lastStartTime: number;
    }>
  >(
    async (accPromise, task, index) => {
      const acc = await accPromise;

      if (index > 0) {
        const elapsed = Date.now() - acc.lastStartTime;
        const remaining = intervalMs - elapsed;
        if (remaining > 0) {
          await delay(remaining);
        }
      }

      const startTime = Date.now();

      const taskPromise = task().then(
        (value): PromiseSettledResult<T> => ({ status: 'fulfilled', value }),
        (reason): PromiseSettledResult<T> => ({ status: 'rejected', reason })
      );

      return {
        inFlight: [...acc.inFlight, taskPromise],
        lastStartTime: startTime,
      };
    },
    Promise.resolve({ inFlight: [], lastStartTime: 0 })
  );

  return Promise.all(inFlight);
};

export const summarizeResults = <T>(
  results: ReadonlyArray<PromiseSettledResult<T>>
): BatchResult => ({
  total: results.length,
  succeeded: results.filter(r => r.status === 'fulfilled').length,
  failed: results.filter(r => r.status === 'rejected').length,
  errors: results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => r.reason?.message || 'Unknown error'),
});

const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));
