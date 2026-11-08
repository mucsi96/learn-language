import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Select } from '@mucsi96/react-ui';
import { z } from 'zod';
import { apiQuery, request, sendJson } from '../../api/http';
import { environment, idSchema, post, type Candidate } from './api';
import styles from './Creation.module.css';

export function PendingPhoto({
  sourceId,
  onCandidates,
}: {
  sourceId: string;
  onCandidates: (items: Candidate[]) => void;
}) {
  const path = `/api/source/${sourceId}/pending-photo`;
  const client = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const status = useQuery({
    ...apiQuery(
      path,
      z.object({ hasPending: z.boolean(), createdAt: z.string().nullish(), expiresAt: z.string().nullish() })
    ),
    refetchInterval: 10000,
  });
  const [count, setCount] = useState(10);
  const [message, setMessage] = useState('');
  const action = useMutation({
    mutationFn: async (work: () => Promise<void>) => {
      await work();
      await client.invalidateQueries({ queryKey: [path] });
    },
  });
  const consume = () =>
    action.mutate(async () => {
      const config = await environment();
      const model = config.primaryModelByOperation.extraction;
      if (!model) throw new Error('No primary extraction model is configured');
      const result = await post(
        `${path}/consume`,
        { cardCount: count },
        z.object({ sentences: z.array(z.object({ sentence: z.string(), hint: z.string().nullish() })) }),
        { 'X-Operation-ID': crypto.randomUUID() }
      );
      const items = await Promise.all(
        result.sentences.map(async (sentence) => ({
          sentence: sentence.sentence,
          ...(sentence.hint ? { hint: sentence.hint } : {}),
          ...(await post('/api/sentence-id', { germanSentence: sentence.sentence, sourceId }, idSchema)),
          extractionModel: model,
        }))
      );
      onCandidates(items);
    });
  return (
    <div className={styles.fields}>
      <Button
        variant="outlined"
        aria-label="Capture photo for grammar cards"
        isDisabled={action.isPending}
        onPress={() => input.current?.click()}
      >
        Capture photo
      </Button>
      <input
        ref={input}
        aria-label="Capture or upload grammar lesson photo"
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        capture="environment"
        disabled={action.isPending}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          action.mutate(async () => {
            if (!/\.(png|jpe?g|gif|webp)$/i.test(file.name))
              throw new Error('Only image files (PNG, JPG, JPEG, GIF, WEBP) are allowed');
            const body = new FormData();
            body.append('file', file);
            await request(path, { method: 'POST', body });
            setMessage('Photo ready - open this source on your computer to create cards');
          });
          event.target.value = '';
        }}
      />
      {message && <p role="status">{message}</p>}
      {status.data?.hasPending && (
        <section role="region" aria-label="Pending photo for grammar cards" className={styles.fields}>
          <h2>Photo grammar cards</h2>
          <img
            className={styles.preview}
            src={`${path}/image?createdAt=${encodeURIComponent(status.data.createdAt ?? '')}`}
            alt="Pending grammar lesson photo"
          />
          <p>Expires: {status.data.expiresAt}</p>
          <Select
            label="How many cards?"
            options={[5, 10, 15, 20, 30].map((value) => ({ id: String(value), label: `${value} cards` }))}
            selectedKey={String(count)}
            onSelectionChange={(key) => setCount(Number(key))}
          />
          <div className={styles.actions}>
            <Button aria-label="Create grammar cards from this photo" isDisabled={action.isPending} onPress={consume}>
              Create grammar cards
            </Button>
            <Button
              variant="text"
              tone="error"
              aria-label="Discard pending photo"
              isDisabled={action.isPending}
              onPress={() => action.mutate(() => sendJson(path, 'DELETE'))}
            >
              Discard photo
            </Button>
          </div>
        </section>
      )}
      {action.error && (
        <p role="alert" className={styles.error}>
          {action.error.message}
        </p>
      )}
      {status.error && <p role="alert">{status.error.message}</p>}
    </div>
  );
}
