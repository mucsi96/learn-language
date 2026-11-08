import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, DataTable, TextField } from '@mucsi96/react-ui';
import { z } from 'zod';
import { apiQuery, request, sendJson } from '../../api/http';
import { useAction } from '../../api/mutations';
import { QueryState } from '../../components/QueryState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import styles from '../../components/Forms.module.css';

const schema = z.object({
  count: z.number(),
  words: z.array(z.object({ word: z.string(), hungarianTranslation: z.string().nullable() })),
});
export default function KnownWords() {
  const query = useQuery(apiQuery('/api/known-words', schema));
  const [text, setText] = useState('');
  const [count, setCount] = useState<number>();
  const [confirm, setConfirm] = useState(false);
  const importWords = useAction(async () => {
    setCount(undefined);
    const response = await request('/api/known-words/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    setCount(z.object({ importedCount: z.number() }).parse(await response.json()).importedCount);
    setText('');
  });
  const remove = useAction((word: string) => sendJson(`/api/known-words/${encodeURIComponent(word)}`, 'DELETE'));
  const clear = useAction(
    () => sendJson('/api/known-words', 'DELETE'),
    () => {
      setConfirm(false);
      setCount(undefined);
    }
  );
  return (
    <div className={styles.form}>
      <Card>
        <h2>Import Known Words</h2>
        <p>
          Paste CSV data with German words and Hungarian translations. Each line should have format: german word,
          hungarian translation
        </p>
        <TextField label="Words to import" multiline rows={8} value={text} onChange={setText} />
        <div className={styles.toolbar}>
          <Button
            aria-label="Import words"
            onPress={() => importWords.mutate()}
            isDisabled={!text.trim() || importWords.isPending}
          >
            Import
          </Button>
          {count !== undefined && <span role="status">{count} new words imported</span>}
        </div>
      </Card>
      <QueryState query={query} label="Loading known words">
        {(data) => (
          <Card>
            <h2>Known Words ({data.count})</h2>
            {data.count > 0 && (
              <Button variant="text" aria-label="Clear all known words" onPress={() => setConfirm(true)}>
                Clear all words
              </Button>
            )}
            <DataTable
              caption="Known words"
              rows={data.words}
              getRowKey={(word) => word.word}
              emptyMessage="No known words yet"
              columns={[
                { id: 'word', label: 'German', renderCell: (word) => word.word },
                { id: 'translation', label: 'Hungarian', renderCell: (word) => word.hungarianTranslation ?? '-' },
                {
                  id: 'actions',
                  label: '',
                  renderCell: (word) => (
                    <Button
                      variant="text"
                      aria-label="Delete word"
                      onPress={() => remove.mutate(word.word)}
                      isDisabled={remove.isPending}
                    >
                      Delete
                    </Button>
                  ),
                },
              ]}
            />
            {data.count === 0 && <p>Import words from other applications to skip them during card creation</p>}
            {confirm && (
              <ConfirmDialog
                message={`Delete all ${data.count} known words?`}
                onClose={() => setConfirm(false)}
                onConfirm={() => clear.mutate()}
                pending={clear.isPending}
              />
            )}
          </Card>
        )}
      </QueryState>
    </div>
  );
}
