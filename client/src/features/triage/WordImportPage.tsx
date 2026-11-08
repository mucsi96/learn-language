import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, BarLoader } from '@mucsi96/react-ui';
import { apiQuery, getJson, sendJson } from '../../api/http';
import { sourceSchema } from '../../api/schemas';
import { QueryState } from '../../components/QueryState';
import { enqueueTriage, flushTriage, queueSchema, stageWords, triagePath } from './api';
import type { Candidate, Decision } from './api';
import styles from './Triage.module.css';

const labels: Record<string, string> = {
  VERB: 'Ige',
  ADJECTIVE: 'Melléknév',
  ADVERB: 'Határozószó',
  PRONOUN: 'Névmás',
  PREPOSITION: 'Elöljárószó',
  CONJUNCTION: 'Kötőszó',
  INTERJECTION: 'Indulatszó',
  ARTICLE: 'Névelő',
  NUMERAL: 'Számnév',
  DETERMINER: 'Determináns',
  NOUN: 'Főnév',
  EXPRESSION: 'Kifejezés',
  OTHER: 'Egyéb',
};
const articleColors: Record<string, string> = { der: '#2196f3', die: '#f44336', das: '#4caf50' };

function Flashcard({
  candidate,
  revealed,
  flip,
  decide,
}: {
  candidate: Candidate;
  revealed: boolean;
  flip: () => void;
  decide: (decision: Decision) => void;
}) {
  const pointer = useRef<{ start: number; distance: number } | null>(null);
  const [offset, setOffset] = useState(0);
  return (
    <div className={styles.deck}>
      <article
        role="button"
        tabIndex={0}
        aria-label="Flashcard"
        aria-pressed={revealed}
        className={styles.card}
        style={{ transform: `translateX(${offset}px) rotate(${offset / 25}deg)` }}
        onKeyDown={(event) => {
          if (['Enter', ' '].includes(event.key)) {
            event.preventDefault();
            event.stopPropagation();
            flip();
          }
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          pointer.current = { start: event.clientX, distance: 0 };
        }}
        onPointerMove={(event) => {
          if (!pointer.current) return;
          const delta = event.clientX - pointer.current.start;
          pointer.current = { ...pointer.current, distance: Math.max(pointer.current.distance, Math.abs(delta)) };
          setOffset(delta);
        }}
        onPointerCancel={() => {
          pointer.current = null;
          setOffset(0);
        }}
        onPointerUp={() => {
          const distance = pointer.current?.distance;
          pointer.current = null;
          setOffset(0);
          if (offset <= -110) decide('known');
          else if (offset >= 110) decide('card');
          else if (distance !== undefined && distance < 8) flip();
        }}
      >
        <span className={styles.hint}>{offset <= -24 ? 'Known' : offset >= 24 ? 'Learn' : ''}</span>
        {revealed && (
          <div className={styles.chips}>
            {candidate.wordType && (
              <span aria-label="Word type">{labels[candidate.wordType.toUpperCase()] ?? candidate.wordType}</span>
            )}
            <span aria-label={`${candidate.occurrenceCount} occurrences in the source`}>
              {candidate.occurrenceCount}×
            </span>
          </div>
        )}
        <h2
          style={{ color: revealed && candidate.article ? articleColors[candidate.article.toLowerCase()] : undefined }}
        >
          {revealed && candidate.article ? `${candidate.article} ` : ''}
          {candidate.lemma}
        </h2>
        {candidate.examples[0] && <p>{candidate.examples[0]}</p>}
      </article>
    </div>
  );
}

export function WordImportPage() {
  const { sourceId } = useParams();
  if (!sourceId) throw new Error('A source is required');
  return <WordImport sourceId={sourceId} key={sourceId} />;
}

function WordImport({ sourceId }: { sourceId: string }) {
  const client = useQueryClient();
  const path = triagePath(sourceId);
  const sources = useQuery(apiQuery('/api/sources', sourceSchema.array()));
  const source = sources.data?.find((value) => value.id === sourceId);
  const query = useQuery({
    ...apiQuery(path, queueSchema),
    queryFn: async ({ signal }) => {
      await flushTriage(path);
      return getJson(path, queueSchema, signal);
    },
    enabled: source?.sourceType === 'wordTriage',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const [history, setHistory] = useState<{ candidate: Candidate; decision: Decision }[]>([]);
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const failures = useRef(0);
  const chain = useRef(Promise.resolve());
  const maintenance = useRef(false);
  const [revealed, setRevealed] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const queue = query.data;
  const remaining = queue?.candidates ?? [];
  const current = remaining[0];
  const enqueue = useCallback(
    (candidateId: number, action: Decision | 'undo') => {
      setPending((count) => count + 1);
      chain.current = enqueueTriage(path, () => sendJson(`${path}/candidates/${candidateId}/${action}`, 'POST'))
        .catch(() => {
          failures.current += 1;
          setFailed(failures.current);
        })
        .finally(() => setPending((count) => count - 1));
    },
    [path]
  );
  const decide = useCallback(
    (decision: Decision) => {
      if (!current || maintenance.current) return;
      void client.cancelQueries({ queryKey: [path] });
      client.setQueryData(
        [path],
        (previous: typeof queue) =>
          previous && {
            ...previous,
            candidates: previous.candidates.filter((candidate) => candidate.id !== current.id),
            stats: {
              ...previous.stats,
              pendingCount: previous.stats.pendingCount - 1,
              [decision === 'known' ? 'knownCount' : 'cardCount']:
                previous.stats[decision === 'known' ? 'knownCount' : 'cardCount'] + 1,
            },
          }
      );
      setHistory((previous) => [...previous, { candidate: current, decision }]);
      setRevealed(false);
      enqueue(current.id, decision);
    },
    [client, current, enqueue, path]
  );
  const undo = useCallback(() => {
    const previous = history.at(-1);
    if (!previous || maintenance.current) return;
    void client.cancelQueries({ queryKey: [path] });
    client.setQueryData(
      [path],
      (data: typeof queue) =>
        data && {
          ...data,
          candidates: [previous.candidate, ...data.candidates],
          stats: {
            ...data.stats,
            pendingCount: data.stats.pendingCount + 1,
            [previous.decision === 'known' ? 'knownCount' : 'cardCount']:
              data.stats[previous.decision === 'known' ? 'knownCount' : 'cardCount'] - 1,
          },
        }
    );
    setHistory((entries) => entries.slice(0, -1));
    setRevealed(false);
    enqueue(previous.candidate.id, 'undo');
  }, [client, history, enqueue, path]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (
        (event.target as HTMLElement)?.closest('input, textarea, select, [contenteditable=true]') ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.repeat
      )
        return;
      const key = event.key.toLowerCase();
      if (['backspace', 'u'].includes(key) && history.length) {
        event.preventDefault();
        undo();
      } else if (current && ['arrowleft', 'k', 'arrowright', 'n'].includes(key)) {
        event.preventDefault();
        decide(['arrowleft', 'k'].includes(key) ? 'known' : 'card');
      } else if (current && key === 'enter' && !(event.target as HTMLElement)?.closest('button, a, [role=button]')) {
        event.preventDefault();
        setRevealed((value) => !value);
      }
    };
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, [current, history.length, decide, undo]);
  const reload = async () => {
    maintenance.current = true;
    try {
      await chain.current;
      const result = await query.refetch();
      if (!result.isSuccess) return;
      failures.current = 0;
      setFailed(0);
      setHistory([]);
      setRevealed(false);
      void client.invalidateQueries({ queryKey: ['/api/sources'] });
    } finally {
      maintenance.current = false;
    }
  };
  const stage = useMutation({
    mutationFn: async (file: File) => {
      setFileName(file.name);
      setError(null);
      return stageWords(sourceId, await file.text());
    },
    onSuccess: async () => {
      await reload();
    },
    onError: (cause: Error) => setError(cause.message),
  });
  const clear = useMutation({
    mutationFn: async () => {
      maintenance.current = true;
      try {
        await chain.current;
        if (failures.current > 0) {
          await reload();
          return;
        }
        await sendJson(path, 'DELETE');
        await reload();
      } finally {
        maintenance.current = false;
      }
    },
    onSuccess: () => stage.reset(),
    onError: (cause: Error) => setError(cause.message),
  });
  const known = queue?.stats.knownCount ?? 0;
  const cards = queue?.stats.cardCount ?? 0;
  const total = known + cards + remaining.length;
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/sources" aria-label="Back to sources">
          Back to sources
        </Link>
        <div>
          <h1>Word triage</h1>
          <p>{source?.name}</p>
        </div>
      </header>
      <QueryState query={sources} label="Retrieving sources">
        {() =>
          !source ? (
            <p role="alert">Source not found</p>
          ) : source.sourceType !== 'wordTriage' ? (
            <section role="alert">
              <h2>Word triage is not available here</h2>
              <p>Only word triage sources can import a word list.</p>
            </section>
          ) : (
            <QueryState query={query} label="Loading word queue">
              {() => (
                <>
                  {stage.data && (
                    <p role="status">
                      {stage.data.totalWords} words in file · {stage.data.stagedCount} to triage ·{' '}
                      {stage.data.alreadyKnownCount} already known · {stage.data.existingCardCount} already have cards ·{' '}
                      {stage.data.duplicateCount} duplicates
                      {stage.data.stagedCount === 0 && ' · No new words to triage in this file'}
                    </p>
                  )}
                  {total === 0 ? (
                    <section
                      className={styles.drop}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const file = event.dataTransfer.files[0];
                        if (file && !stage.isPending) stage.mutate(file);
                      }}
                    >
                      <h2>Drop a word list</h2>
                      <p>
                        Drag the analyzer JSON here, or pick it from your device. Words you already know and words that
                        already have a card are filtered out automatically.
                      </p>
                      <input
                        ref={fileInput}
                        type="file"
                        accept="application/json,.json"
                        aria-label="Word list JSON file"
                        disabled={stage.isPending}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) stage.mutate(file);
                          event.target.value = '';
                        }}
                      />
                      <Button isDisabled={stage.isPending} onPress={() => fileInput.current?.click()}>
                        Choose JSON file
                      </Button>
                      <p>{fileName}</p>
                      {stage.isPending && <BarLoader label="Staging words" />}
                    </section>
                  ) : current ? (
                    <section>
                      <progress
                        className={styles.progress}
                        aria-label="Triage progress"
                        max={total}
                        value={known + cards}
                      />
                      <div className={styles.counters}>
                        <span aria-label={`Known: ${known}`}>Known: {known}</span>
                        <span aria-label={`New cards: ${cards}`}>New cards: {cards}</span>
                        <span aria-label={`Remaining: ${remaining.length}`}>Remaining: {remaining.length}</span>
                      </div>
                      <Flashcard
                        key={current.id}
                        candidate={current}
                        revealed={revealed}
                        flip={() => setRevealed((value) => !value)}
                        decide={decide}
                      />
                      <div className={styles.actions}>
                        <Button aria-label="I know this word" onPress={() => decide('known')}>
                          I know this
                        </Button>
                        <Button aria-label="Undo last decision" isDisabled={!history.length} onPress={undo}>
                          Undo
                        </Button>
                        <Button aria-label="Add as new card" onPress={() => decide('card')}>
                          Learn it
                        </Button>
                      </div>
                      <p className={styles.shortcuts}>
                        Tap the card or press Enter to flip it. Swipe, or use ← / K for known, → / N for a new card,
                        Backspace to undo.
                      </p>
                    </section>
                  ) : (
                    <section className={styles.summary}>
                      <h2>Triage complete</h2>
                      <p>
                        Marked as known: {known} · Draft cards created: {cards}
                      </p>
                      <div className={styles.actions}>
                        <Link to={`/sources/${sourceId}/cards?filter=draft`}>Review draft cards</Link>
                        <Button isDisabled={clear.isPending} onPress={() => clear.mutate()}>
                          Import another list
                        </Button>
                        <Button
                          aria-label="Undo last decision"
                          isDisabled={!history.length || clear.isPending}
                          onPress={undo}
                        >
                          Undo
                        </Button>
                      </div>
                    </section>
                  )}
                  {pending > 0 ? (
                    <p role="status">Saving decisions…</p>
                  ) : failed > 0 ? (
                    <p role="alert">
                      Unsaved decisions: {failed}{' '}
                      <Button
                        onPress={() => {
                          void reload();
                        }}
                      >
                        Retry unsaved decisions
                      </Button>
                    </p>
                  ) : (
                    total > 0 && <p role="status">All decisions saved</p>
                  )}
                </>
              )}
            </QueryState>
          )
        }
      </QueryState>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
