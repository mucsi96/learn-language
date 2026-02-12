export type DotStatus = 'pending' | 'in-progress' | 'completed' | 'error';

export type DotProgress = {
  label: string;
  status: DotStatus;
  tooltip: string;
};
