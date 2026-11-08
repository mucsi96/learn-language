import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, LoadingArea, Checkbox, TextField } from '@mucsi96/react-ui';
import { apiQuery, sendJson } from '../../api/http';
import { sourceSchema } from '../../api/schemas';
import { QueryState } from '../../components/QueryState';
import { contentPath, contentSchema, formatPosition } from './api';
import type { ContentItem } from './api';
import { ContentPlayer } from './ContentPlayer';
import styles from './Content.module.css';

const labels = {
  missing: 'Missing card',
  not_ready: 'Card not ready',
  unreviewed: 'Needs two reviews',
  satisfied: 'Ready and studied',
};
type ContentMode = 'content' | 'listen';

export function ContentPage({ mode = 'content' }: { mode?: ContentMode }) {
  const { sourceId, contentId } = useParams();
  if (!sourceId) throw new Error('A source is required');
  return (
    <SourceContent
      key={`${sourceId}:${contentId ?? ''}:${mode}`}
      sourceId={sourceId}
      contentId={contentId}
      mode={mode}
    />
  );
}

export function ListeningPage() {
  return <ContentPage mode="listen" />;
}

function SourceContent({ sourceId, contentId, mode }: { sourceId: string; contentId?: string; mode: ContentMode }) {
  const sources = useQuery(apiQuery('/api/sources', sourceSchema.array()));
  const source = sources.data?.find((item) => item.id === sourceId);
  const admin = mode === 'content';
  return (
    <div className={styles.page}>
      <nav className={styles.nav} aria-label="Content navigation">
        <Link to={admin ? '/sources' : '/'}>{admin ? 'Sources' : 'Home'}</Link>
        <div className={styles.actions}>
          <Link to={`/sources/${sourceId}/study`}>Study vocabulary</Link>
          {admin && <Link to={`/sources/${sourceId}/cards?filter=draft`}>Draft cards</Link>}
        </div>
      </nav>
      <header>
        <p>{admin ? 'Content library' : 'Listening practice'}</p>
        <h1>{source?.name}</h1>
      </header>
      <QueryState query={sources} label="Retrieving source">
        {() =>
          !source ? (
            <p role="alert">Source not found</p>
          ) : contentId ? (
            <>
              <Link to={`/sources/${sourceId}/${mode}`}>Back to Stories</Link>
              <ContentDetail sourceId={sourceId} contentId={contentId} admin={admin} level={source.languageLevel} />
            </>
          ) : (
            <Catalogue sourceId={sourceId} mode={mode} level={source.languageLevel} />
          )
        }
      </QueryState>
    </div>
  );
}

function Catalogue({ sourceId, mode, level }: { sourceId: string; mode: ContentMode; level: string | null }) {
  const [search, setSearch] = useState('');
  const query = useQuery({
    ...apiQuery(contentPath(sourceId), contentSchema.array()),
    staleTime: 0,
    refetchOnMount: 'always',
  });
  return (
    <>
      <div className={styles.heading}>
        <h2>Stories</h2>
        {mode === 'content' && (
          <Button
            onPress={() => {
              void query.refetch();
            }}
          >
            Refresh catalogue
          </Button>
        )}
      </div>
      <div className={styles.search}>
        <TextField label="Search content" type="search" value={search} onChange={setSearch} />
      </div>
      {query.isPending ? (
        <LoadingArea label="Discovering content" />
      ) : query.isError ? (
        <div role="alert">
          <p>Content discovery failed. Please retry.</p>
          <p>{query.error.message}</p>
          <Button
            onPress={() => {
              void query.refetch();
            }}
          >
            Retry
          </Button>
        </div>
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table} aria-label="Source content">
            <thead>
              <tr>
                <th>Number</th>
                <th>Title</th>
                <th>Duration</th>
                <th>Level</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {query.data
                .filter((item) =>
                  `${item.metadata.title} ${item.metadata.number ?? ''} ${level ?? ''}`
                    .toLocaleLowerCase()
                    .includes(search.toLocaleLowerCase())
                )
                .map((item) => (
                  <tr key={item.id}>
                    <td>{item.metadata.number ?? '—'}</td>
                    <td>
                      <Link to={`/sources/${sourceId}/${mode}/${item.id}`}>{item.metadata.title}</Link>
                    </td>
                    <td>
                      {item.metadata.durationSeconds === null
                        ? 'Unavailable'
                        : formatPosition(item.metadata.durationSeconds)}
                    </td>
                    <td>{level ?? 'Unavailable'}</td>
                    <td>
                      {item.progress?.completed
                        ? 'Completed'
                        : item.progress && item.progress.position > 0
                          ? `Continue from ${formatPosition(item.progress.position)}`
                          : (item.metadata.matchError ??
                            (item.unlocked
                              ? 'Ready to listen'
                              : item.status === 'prepared'
                                ? 'Vocabulary incomplete'
                                : item.status))}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function ContentDetail({
  sourceId,
  contentId,
  admin,
  level,
}: {
  sourceId: string;
  contentId: string;
  admin: boolean;
  level: string | null;
}) {
  const client = useQueryClient();
  const path = contentPath(sourceId, contentId);
  const query = useQuery({
    ...apiQuery(path, contentSchema),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: (result) => (['queued', 'processing'].includes(result.state.data?.status ?? '') ? 1200 : false),
  });
  const [selected, setSelected] = useState<string[]>([]);
  const preparationRequested = useRef(false);
  const action = useMutation({
    mutationFn: ({ name, wordKeys }: { name: string; wordKeys?: string[] }) =>
      sendJson(`${path}/${name}`, 'POST', wordKeys ? { wordKeys } : {}),
    onSuccess: async (_data, variables) => {
      if (variables.wordKeys) setSelected([]);
      await Promise.all([
        client.invalidateQueries({ queryKey: [path] }),
        client.invalidateQueries({ queryKey: [contentPath(sourceId)] }),
        client.invalidateQueries({ queryKey: ['/api/sources'] }),
      ]);
    },
  });
  const prepare = action.mutate;
  useEffect(() => {
    if (
      admin &&
      query.data?.status === 'unprepared' &&
      !query.data.metadata.matchError &&
      !preparationRequested.current
    ) {
      preparationRequested.current = true;
      prepare({ name: 'prepare' });
    }
  }, [admin, query.data, prepare]);
  return (
    <>
      {action.error && <p role="alert">{action.error.message}</p>}
      <QueryState query={query} label="Retrieving content">
        {(item) => {
          const words = item.words.toSorted((a, b) =>
            a.word.lemma.localeCompare(b.word.lemma, 'de', { sensitivity: 'base' })
          );
          const missing = words.filter((word) => word.status === 'missing');
          const selectedKeys = selected.filter((key) => missing.some((word) => word.key === key));
          return (
            <article className={styles.panel} aria-labelledby="story-title">
              <header>
                <h2 id="story-title">{item.metadata.title}</h2>
                <div className={styles.meta}>
                  <span>{level ?? 'Level unavailable'}</span>
                  <span>
                    {item.metadata.durationSeconds === null
                      ? 'Duration unavailable'
                      : formatPosition(item.metadata.durationSeconds)}
                  </span>
                </div>
              </header>
              {item.metadata.matchError && <p role="alert">{item.metadata.matchError}</p>}
              {['queued', 'processing'].includes(item.status) && (
                <section aria-label="Preparing transcript and vocabulary">
                  <h3>Preparing your story</h3>
                  <p>Checking the transcript and vocabulary before listening.</p>
                  <LoadingArea label="Preparing transcript and vocabulary" />
                </section>
              )}
              {item.status === 'failed' && (
                <>
                  <p role="alert">Preparation failed: {item.error}</p>
                  {admin && (
                    <Button isDisabled={action.isPending} onPress={() => action.mutate({ name: 'prepare' })}>
                      Retry preparation
                    </Button>
                  )}
                </>
              )}
              {item.status === 'unprepared' &&
                (admin ? (
                  !item.metadata.matchError && (
                    <Button isDisabled={action.isPending} onPress={() => action.mutate({ name: 'prepare' })}>
                      Prepare story
                    </Button>
                  )
                ) : (
                  <p>Transcript and vocabulary must be prepared in source administration before listening.</p>
                ))}
              {item.status === 'prepared' && (
                <>
                  {admin && (
                    <>
                      <details>
                        <summary>Transcript used</summary>
                        <p className={styles.transcript}>{item.transcript}</p>
                      </details>
                      <section className={styles.vocabulary}>
                        <h3>Missing vocabulary</h3>
                        <p>
                          Every extracted word must be known or have a ready card reviewed at least twice. Unresolved
                          words keep listening locked.
                        </p>
                        {missing.map((candidate) => (
                          <div className={styles.candidate} key={candidate.key}>
                            <Checkbox
                              isSelected={selectedKeys.includes(candidate.key)}
                              isDisabled={action.isPending}
                              onChange={(checked) =>
                                setSelected((keys) =>
                                  checked ? [...keys, candidate.key] : keys.filter((key) => key !== candidate.key)
                                )
                              }
                            >
                              {candidate.word.lemma}
                            </Checkbox>
                            {candidate.word.examples.map((example, index) => (
                              <p key={index}>{example}</p>
                            ))}
                          </div>
                        ))}
                        {!missing.length && (
                          <p>All extracted words are known or already have cards in this source group.</p>
                        )}
                        {!level && missing.length > 0 && (
                          <p role="alert">
                            Choose a language level in <Link to="/sources">source settings</Link> before creating
                            vocabulary drafts.
                          </p>
                        )}
                        <div className={styles.actions}>
                          <Button
                            isDisabled={action.isPending || !selectedKeys.length || !level}
                            onPress={() => action.mutate({ name: 'drafts', wordKeys: selectedKeys })}
                          >
                            Create drafts ({selectedKeys.length})
                          </Button>
                          <Button
                            tone="success"
                            isDisabled={action.isPending || !selectedKeys.length}
                            onPress={() => action.mutate({ name: 'known', wordKeys: selectedKeys })}
                          >
                            Mark as known ({selectedKeys.length})
                          </Button>
                        </div>
                      </section>
                    </>
                  )}
                  <Prerequisites
                    item={item}
                    refresh={() => {
                      void query.refetch();
                    }}
                  />
                  {!admin && item.unlocked && <ContentPlayer key={item.id} sourceId={sourceId} item={item} />}
                </>
              )}
            </article>
          );
        }}
      </QueryState>
    </>
  );
}

function Prerequisites({ item, refresh }: { item: ContentItem; refresh: () => void }) {
  return (
    <section className={styles.prerequisites}>
      <h3>Listening prerequisites</h3>
      <p role="status">{item.unlocked ? 'Ready to listen' : 'Listening locked'}</p>
      {(['missing', 'not_ready', 'unreviewed'] as const).map((status) => {
        const words = item.words
          .filter((word) => word.status === status)
          .toSorted((a, b) => a.word.lemma.localeCompare(b.word.lemma, 'de', { sensitivity: 'base' }));
        return (
          words.length > 0 && (
            <section key={status}>
              <h4>{labels[status]}</h4>
              <ul aria-label={`Vocabulary prerequisites: ${labels[status]}`}>
                {words.map((word) => (
                  <li key={word.key}>{word.word.lemma}</li>
                ))}
              </ul>
            </section>
          )
        );
      })}
      <Button onPress={refresh}>Refresh prerequisites</Button>
    </section>
  );
}
