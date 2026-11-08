import styles from './StateBadge.module.css';

const labels = { NEW: 'New', LEARNING: 'Learning', REVIEW: 'Review', RELEARNING: 'Relearning' };
export function StateBadge({
  state,
  count,
  showLabel = false,
}: {
  state: keyof typeof labels;
  count?: number;
  showLabel?: boolean;
}) {
  return (
    <span
      role="img"
      className={styles.badge}
      data-state={state}
      title={labels[state]}
      aria-label={count === undefined ? `State: ${labels[state]}` : `${labels[state]}: ${count}`}
    >
      {showLabel ? labels[state] : count}
    </span>
  );
}
