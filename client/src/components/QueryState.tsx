import { Alert, Button } from '@mucsi96/react-ui';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import styles from './QueryState.module.css';
import { LoadingArea } from './LoadingArea';

export function QueryState<T>({
  query,
  children,
  label,
}: {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
  label: string;
}) {
  if (query.isPending) return <LoadingArea label={label} />;
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
