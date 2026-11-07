import { useEffect } from 'react';
import { Button } from '@mucsi96/react-ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiQuery, sendJson } from '../../api/http';
import styles from './Creation.module.css';

const issuesSchema = z.array(
  z.object({
    occurrenceId: z.string(),
    provider: z.string(),
    providerName: z.string(),
    firstDetectedAt: z.string(),
    lastDetectedAt: z.string(),
    message: z.string(),
    billingUrl: z.url().refine((value) => new URL(value).protocol === 'https:'),
    canResolve: z.boolean(),
  })
);
export function ProviderBillingAlert() {
  const query = useQuery({ ...apiQuery('/api/provider-billing-issues', issuesSchema), refetchInterval: 15000 });
  const { refetch } = query;
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') void refetch();
    };
    window.addEventListener('ai-operation-failed', refresh);
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('ai-operation-failed', refresh);
      window.removeEventListener('online', refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [refetch]);
  const resolve = useMutation({
    mutationFn: (id: string) => sendJson(`/api/provider-billing-issues/${encodeURIComponent(id)}`, 'DELETE'),
    onSuccess: () => refetch(),
  });
  return (
    <>
      {query.data?.map((issue) => (
        <section
          key={issue.provider}
          role="alert"
          aria-labelledby={`billing-alert-${issue.provider}`}
          className={styles.billingAlert}
        >
          <h2 id={`billing-alert-${issue.provider}`}>{issue.providerName} billing needs attention</h2>
          <p>{issue.message}</p>
          <p>AI operations using {issue.providerName} may fail until this is resolved.</p>
          <p>
            Last reported {new Date(issue.lastDetectedAt).toLocaleString()}. This alert stays visible across visits
            until marked resolved.
          </p>
          <div className={styles.actions}>
            <a href={issue.billingUrl} target="_blank" rel="noopener noreferrer">
              Open {issue.providerName} billing
            </a>
            {issue.canResolve && (
              <Button
                variant="outlined"
                isDisabled={resolve.isPending}
                onPress={() => resolve.mutate(issue.occurrenceId)}
              >
                I've resolved billing
              </Button>
            )}
          </div>
          {resolve.error && <p>Could not mark this issue resolved. Please try again.</p>}
        </section>
      ))}
      {query.error && (
        <div role="status">
          Could not check AI billing status.
          <Button
            variant="text"
            onPress={() => {
              void refetch();
            }}
          >
            Retry billing status
          </Button>
        </div>
      )}
    </>
  );
}
