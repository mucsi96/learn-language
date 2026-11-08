import { BarLoader } from '@mucsi96/react-ui';
import styles from './LoadingArea.module.css';

export function LoadingArea({ label }: { label: string }) {
  return (
    <div className={styles.area}>
      <BarLoader label={label} />
    </div>
  );
}
