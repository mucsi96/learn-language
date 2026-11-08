import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Dialog } from '@mucsi96/react-ui';
import { Link, useParams } from 'react-router-dom';
import { z } from 'zod';
import { apiQuery } from '../../api/http';
import { sourceSchema } from '../../api/schemas';
import { parseSuggestionsJson } from './jsonImport';
import { createDraft } from './pipeline';
import styles from './Creation.module.css';

export function JsonPage() {
  const { sourceId } = useParams();
  if (!sourceId) throw new Error('Missing source ID');
  const queryClient = useQueryClient();
  const sources = useQuery(apiQuery('/api/sources', z.array(sourceSchema)));
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');
  const parsed = parseSuggestionsJson(text);
  const importing = useMutation({
    mutationFn: async () => {
      if (!parsed?.success) throw new Error('Expected a non-empty JSON array of cards with id, frontText and backText');
      const cards = parsed.data;
      const chunks = Array.from({ length: Math.ceil(cards.length / 10) }, (_, index) =>
        cards.slice(index * 10, index * 10 + 10)
      );
      const results = await chunks.reduce<Promise<PromiseSettledResult<void>[]>>(
        async (previous, chunk) => [
          ...(await previous),
          ...(await Promise.allSettled(
            chunk.map((card) =>
              createDraft(sourceId, 1, 'simple', card.id, {
                frontText: card.frontText,
                backText: card.backText,
                ...(card.topic ? { topic: card.topic } : {}),
                ...(card.category ? { category: card.category } : {}),
              })
            )
          )),
        ],
        Promise.resolve([])
      );
      const failed = cards.filter((_, index) => results[index].status === 'rejected');
      setMessage(
        failed.length
          ? `Failed to import ${failed.length} of ${cards.length} cards`
          : `Imported ${cards.length} cards as drafts`
      );
      setText(failed.length ? JSON.stringify(failed, null, 2) : '');
      if (!failed.length) setOpen(false);
      await queryClient.invalidateQueries();
    },
  });
  return (
    <section className={styles.page}>
      <h1>{sources.data?.find((source) => source.id === sourceId)?.name ?? 'JSON cards'}</h1>
      <p>Import question and answer cards with Markdown support.</p>
      <div className={styles.actions}>
        <Button onPress={() => setOpen(true)}>Import JSON</Button>
        <Link to={`/sources/${sourceId}/cards`}>View cards</Link>
      </div>
      {message && !open && <p role="status">{message}</p>}
      {open && (
        <Dialog
          title="Import cards from JSON"
          isOpen
          onOpenChange={(value) => {
            if (!importing.isPending) setOpen(value);
          }}
        >
          <div className={styles.fields}>
            <pre aria-label="Expected JSON structure">{JSON.stringify([{ id: 'Card id', frontText: 'Question (Markdown)', backText: 'Answer (Markdown)', topic: 'Optional topic', category: 'Optional category' }], null, 2)}</pre>
            {message && <p role="status">{message}</p>}
            <label>
              Cards JSON
              <textarea
                rows={12}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={
                  '[{"id":"unique-id","frontText":"Question","backText":"Answer","topic":"Optional","category":"Optional"}]'
                }
              />
            </label>
            <label>
              Choose JSON file
              <input
                type="file"
                accept="application/json,.json"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void file.text().then(setText);
                }}
              />
            </label>
            {text && !parsed?.success && (
              <p role="alert" className={styles.error}>
                {parsed?.error}
              </p>
            )}
            {importing.error && <p role="alert">{importing.error.message}</p>}
            <p>{parsed?.success ? parsed.data.length : 0} cards</p>
            <div className={styles.actions}>
              <Button variant="text" isDisabled={importing.isPending} onPress={() => setOpen(false)}>
                Cancel
              </Button>
              <Button isDisabled={!parsed?.success || importing.isPending} onPress={() => importing.mutate()}>
                {parsed?.success ? `Import ${parsed.data.length} cards` : 'Import'}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </section>
  );
}
