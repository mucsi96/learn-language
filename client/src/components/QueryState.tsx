import { Alert, BarLoader, Button } from '@mucsi96/react-ui';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import styles from './QueryState.module.css';

export function QueryState<T>({
  query,
  children,
  label,
}: {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
  label: string;
}) {
  if (query.isPending) return <BarLoader label={label} />;
  if (query.isError)
    return (
      <Alert className={styles.error} tone="error" title="Unable to load">
        {query.error.message}
        <Button
          onPress={() => {
            void query.refetch();
          }}
        >
          Retry
        </Button>
      </Alert>
    );
  return children(query.data);
}
