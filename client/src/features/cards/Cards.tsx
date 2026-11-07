import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Select, TextField, useNotifications } from '@mucsi96/react-ui';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams, IDatasource } from 'ag-grid-community';
import { z } from 'zod';
import { apiQuery, sendJson } from '../../api/http';
import { useAction } from '../../api/mutations';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { enrichDraftCards, useCreationJob } from '../creation/pipeline';
import { CreationProgress } from '../creation/Dialogs';
import { gridTheme, queryString } from './grid';
import styles from './Cards.module.css';

const readinessValues = ['DRAFT', 'READY', 'IN_REVIEW', 'REVIEWED', 'KNOWN'] as const;
const rowSchema = z.object({
  id: z.string(),
  readiness: z.enum(readinessValues),
  state: z.string(),
  reps: z.number(),
  lapses: z.number(),
  stability: z.number(),
  correctStreak: z.number().nullable(),
  lastReviewDaysAgo: z.number().nullable(),
  reviewScore: z.number().nullable(),
  sourcePageNumber: z.number(),
});
type Row = z.infer<typeof rowSchema>;
const responseSchema = z.object({ rows: z.array(rowSchema), totalCount: z.number() });
const daysAgo = (days: number) =>
  days === 0
    ? 'Today'
    : days === 1
      ? 'Yesterday'
      : days < 30
        ? `${days} days ago`
        : days < 60
          ? '1 month ago'
          : days < 365
            ? `${Math.floor(days / 30)} months ago`
            : days < 730
              ? '1 year ago'
              : `${Math.floor(days / 365)} years ago`;
type Action = 'delete' | 'audio' | 'draft' | 'known';

export default function Cards() {
  const { sourceId } = useParams();
  const [search] = useSearchParams();
  return (
    <CardsTable
      key={`${sourceId}:${search.get('filter')}`}
      sourceId={z.string().parse(sourceId)}
      quickFilter={search.get('filter')}
    />
  );
}

function CardsTable({ sourceId, quickFilter }: { sourceId: string; quickFilter: string | null }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const notifications = useNotifications();
  const [readiness, setReadiness] = useState<readonly string[]>(
    quickFilter === 'draft'
      ? ['DRAFT']
      : ['flagged', 'unhealthy', 'suggestedKnown'].includes(quickFilter ?? '')
        ? []
        : ['READY', 'IN_REVIEW', 'REVIEWED']
  );
  const [state, setState] = useState('');
  const [lastReview, setLastReview] = useState('');
  const [score, setScore] = useState('');
  const [text, setText] = useState('');
  const [filterText, setFilterText] = useState('');
  const [selection, setSelection] = useState<{ filters: string; ids: readonly string[] }>({ filters: '', ids: [] });
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState<string>();
  const [confirm, setConfirm] = useState<Exclude<Action, 'known'>>();
  const [progressOpen, setProgressOpen] = useState(false);
  const job = useCreationJob();
  useEffect(() => {
    const timer = setTimeout(() => setFilterText(text), 300);
    return () => clearTimeout(timer);
  }, [text]);
  const filters = queryString({
    readiness: readiness.length && readiness.length < 5 ? readiness.join(',') : undefined,
    state,
    lastReviewDaysAgo: lastReview,
    minReviewScore: score.split('-')[0],
    maxReviewScore: score.split('-')[1],
    cardFilter: filterText,
    flagged: quickFilter === 'flagged' ? true : undefined,
    unhealthy: quickFilter === 'unhealthy' ? true : undefined,
    suggestedKnown: quickFilter === 'suggestedKnown' ? true : undefined,
  });
  const selected = selection.filters === filters ? selection.ids : [];
  const setSelected = (next: readonly string[] | ((current: readonly string[]) => readonly string[])) =>
    setSelection((current) => ({
      filters,
      ids: typeof next === 'function' ? next(current.filters === filters ? current.ids : []) : next,
    }));
  const ids = useQuery(
    apiQuery(`/api/source/${encodeURIComponent(sourceId)}/card-ids?${filters}`, z.array(z.string()))
  );
  const draftIds = useQuery(
    apiQuery(`/api/source/${encodeURIComponent(sourceId)}/card-ids?readiness=DRAFT`, z.array(z.string()))
  );
  const containsDraft = selected.some((id) => draftIds.data?.includes(id));
  const complete = useAction(
    async () => {
      setProgressOpen(true);
      const result = await enrichDraftCards([...selected]);
      if (result.succeeded) notifications.success(`${result.succeeded} card(s) completed`);
    },
    () => {
      setSelected([]);
      setRevision((value) => value + 1);
    }
  );
  const action = useAction(
    async (kind: Action) => {
      await sendJson(
        kind === 'delete' ? '/api/cards' : kind === 'audio' ? '/api/cards/audio' : `/api/cards/mark-${kind}`,
        kind === 'delete' || kind === 'audio' ? 'DELETE' : 'PUT',
        selected
      );
      notifications.success(
        kind === 'audio'
          ? `Audio deleted for ${selected.length} card(s)`
          : `${selected.length} card(s) ${kind === 'known' ? 'marked as known' : kind === 'draft' ? 'moved to draft' : 'deleted'}`
      );
    },
    () => {
      setConfirm(undefined);
      setSelected([]);
      setRevision((value) => value + 1);
    }
  );
  const datasource = useMemo<IDatasource>(
    () => ({
      getRows: (params) => {
        const sort = params.sortModel[0];
        const path = `/api/source/${encodeURIComponent(sourceId)}/cards?${filters}&${queryString({ startRow: params.startRow, endRow: params.endRow, sortField: sort?.colId, sortDirection: sort?.sort })}`;
        void client
          .fetchQuery({ ...apiQuery(path, responseSchema), queryKey: [path, String(revision)], staleTime: 0 })
          .then(
            (data) => {
              setError(undefined);
              params.successCallback(data.rows, data.totalCount);
            },
            (error: Error) => {
              setError(error.message);
              params.failCallback();
            }
          );
      },
    }),
    [client, sourceId, filters, revision]
  );
  const columns: ColDef<Row>[] = [
    {
      colId: 'selection',
      width: 65,
      sortable: false,
      headerComponent: () => (
        <input
          type="checkbox"
          aria-label={`Select all ${ids.data?.length ?? 0} cards`}
          checked={!!ids.data?.length && selected.length === ids.data.length}
          disabled={!ids.data || action.isPending}
          onChange={(event) => setSelected(event.target.checked ? ids.data! : [])}
        />
      ),
      cellRenderer: ({ data }: ICellRendererParams<Row>) =>
        data && (
          <input
            type="checkbox"
            aria-label={`Select ${data.id}`}
            checked={selected.includes(data.id)}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) =>
              setSelected((current) =>
                event.target.checked ? [...current, data.id] : current.filter((id) => id !== data.id)
              )
            }
          />
        ),
    },
    { headerName: 'ID', field: 'id', minWidth: 180, flex: 2 },
    { headerName: 'Readiness', field: 'readiness', sortable: false, width: 130 },
    { headerName: 'State', field: 'state', width: 130 },
    {
      headerName: 'Stability',
      field: 'stability',
      width: 110,
      valueFormatter: ({ value }) => (value == null ? '' : `${Math.round(value)}d`),
    },
    { headerName: 'Reps', field: 'reps', width: 90 },
    { headerName: 'Lapses', field: 'lapses', width: 100 },
    { headerName: 'Streak', field: 'correctStreak', width: 100 },
    {
      headerName: 'Last review',
      field: 'lastReviewDaysAgo',
      width: 150,
      valueFormatter: ({ value }) => (value == null ? '' : daysAgo(value)),
    },
    {
      headerName: 'Score',
      field: 'reviewScore',
      width: 100,
      valueFormatter: ({ value }) => (value == null ? '' : `${value}%`),
    },
  ];
  return (
    <div className={styles.page}>
      <title>Cards | Learn language</title>
      <section className={styles.filters} aria-label="Card filters">
        <fieldset className={styles.readiness}>
          <legend>Filter by readiness</legend>
          {readinessValues.map((value) => (
            <label key={value}>
              <input
                type="checkbox"
                checked={readiness.includes(value)}
                onChange={(event) =>
                  setReadiness((current) =>
                    event.target.checked ? [...current, value] : current.filter((item) => item !== value)
                  )
                }
              />
              {value}
            </label>
          ))}
        </fieldset>
        <Select
          label="State"
          aria-label="Filter by state"
          selectedKey={state}
          onSelectionChange={(key) => setState(String(key))}
          options={['', 'NEW', 'LEARNING', 'REVIEW', 'RELEARNING'].map((id) => ({ id, label: id || 'All' }))}
        />
        <Select
          label="Last review"
          aria-label="Filter by last review time"
          selectedKey={lastReview}
          onSelectionChange={(key) => setLastReview(String(key))}
          options={[
            ['', 'All'],
            ['0', 'Today'],
            ['3', 'Last 3 days'],
            ['7', 'Last 7 days'],
            ['30', 'Last 30 days'],
            ['90', 'Last 90 days'],
          ].map(([id, label]) => ({ id, label }))}
        />
        <Select
          label="Review score"
          aria-label="Filter by review score"
          selectedKey={score}
          onSelectionChange={(key) => setScore(String(key))}
          options={['', '0-50', '51-75', '76-90', '91-95', '96-99', '100-100'].map((id) => ({
            id,
            label: id === '' ? 'All' : id === '100-100' ? '100%' : id.replace('-', '% - ') + '%',
          }))}
        />
        <TextField label="ID" aria-label="Filter by ID" value={text} onChange={setText} />
      </section>
      {(error || ids.error || draftIds.error) && (
        <p role="alert" className={styles.error}>
          {error ?? ids.error?.message ?? draftIds.error?.message}
          <Button
            onPress={() => {
              setRevision((value) => value + 1);
              void ids.refetch();
              void draftIds.refetch();
            }}
          >
            Retry
          </Button>
        </p>
      )}
      <div className={styles.grid}>
        <AgGridReact<Row>
          theme={gridTheme}
          columnDefs={columns}
          defaultColDef={{ sortable: true, resizable: true }}
          rowModelType="infinite"
          cacheBlockSize={100}
          maxBlocksInCache={10}
          datasource={datasource}
          getRowId={({ data }) => data.id}
          onRowClicked={({ data, event }) => {
            if (data && data.readiness !== 'DRAFT' && !(event?.target instanceof HTMLInputElement))
              void navigate(`/sources/${sourceId}/page/${data.sourcePageNumber}/cards/${data.id}`);
          }}
        />
      </div>
      {selected.length > 0 && (
        <div className={styles.actions}>
          <Button tone="error" isDisabled={action.isPending} onPress={() => setConfirm('delete')}>
            Delete {selected.length}
          </Button>
          {!containsDraft && draftIds.isSuccess && (
            <>
              <Button isDisabled={action.isPending} onPress={() => setConfirm('audio')}>
                Delete audio {selected.length}
              </Button>
              <Button tone="success" isDisabled={action.isPending} onPress={() => action.mutate('known')}>
                Mark {selected.length} as known
              </Button>
              <Button isDisabled={action.isPending} onPress={() => setConfirm('draft')}>
                Move {selected.length} to draft
              </Button>
            </>
          )}
        </div>
      )}
      {confirm && (
        <ConfirmDialog
          message={`Are you sure you want to ${confirm === 'audio' ? 'delete audio for' : confirm === 'draft' ? 'move' : 'delete'} ${selected.length} card(s)${confirm === 'draft' ? ' back to draft' : ''}?`}
          onClose={() => setConfirm(undefined)}
          onConfirm={() => action.mutate(confirm)}
          pending={action.isPending}
        />
      )}
      {containsDraft && (
        <Button
          aria-label="Complete draft cards"
          isDisabled={job.isProcessing || complete.isPending}
          onPress={() => complete.mutate()}
        >
          Complete {selected.length} cards
        </Button>
      )}
      {progressOpen && <CreationProgress onClose={() => setProgressOpen(false)} />}
    </div>
  );
}
