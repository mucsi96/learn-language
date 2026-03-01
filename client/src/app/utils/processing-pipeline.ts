import { WritableSignal } from '@angular/core';
import { DotProgress, DotStatus } from '../shared/types/dot-progress.types';

export type PipelineResult = {
  total: number;
  succeeded: number;
  failed: number;
  errors: string[];
};

export type ProgressUpdater = (status: DotStatus, tooltip: string) => void;

export type PipelineTask<T> = {
  label: string;
  execute: (
    updateProgress: ProgressUpdater,
    toolsRequested: () => void
  ) => Promise<T>;
};

const updateDot = (
  progress: WritableSignal<DotProgress[]>,
  index: number,
  status: DotStatus,
  tooltip: string
): void => {
  progress.update((dots) =>
    dots.map((dot, i) => (i === index ? { ...dot, status, tooltip } : dot))
  );
};

export const runPipeline = async <T>(
  tasks: ReadonlyArray<PipelineTask<T>>,
  progress: WritableSignal<DotProgress[]>
): Promise<PipelineResult> => {
  if (tasks.length === 0) {
    return { total: 0, succeeded: 0, failed: 0, errors: [] };
  }

  progress.set(
    tasks.map((task) => ({
      label: task.label,
      status: 'pending' as const,
      tooltip: `${task.label}: Queued`,
    }))
  );

  const launched: Promise<PromiseSettledResult<T>>[] = [];

  for (const [index, task] of tasks.entries()) {
    const updater: ProgressUpdater = (status, tooltip) => {
      updateDot(progress, index, status, tooltip);
    };

    const toolsRequestedPromise = new Promise<void>((resolve) => {
      launched.push(
        task
          .execute(updater, resolve)
          .then(
            (value): PromiseSettledResult<T> => ({
              status: 'fulfilled',
              value,
            })
          )
          .catch((reason): PromiseSettledResult<T> => {
            const msg =
              reason instanceof Error ? reason.message : 'Unknown error';
            updater('error', `${task.label}: Error - ${msg}`);
            resolve();
            return { status: 'rejected', reason };
          })
      );
    });

    await toolsRequestedPromise;
  }

  const settled = await Promise.all(launched);

  return {
    total: settled.length,
    succeeded: settled.filter((r) => r.status === 'fulfilled').length,
    failed: settled.filter((r) => r.status === 'rejected').length,
    errors: settled
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => r.reason?.message || 'Unknown error'),
  };
};
