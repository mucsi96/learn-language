import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Select, useNotifications } from '@mucsi96/react-ui';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams, IDatasource } from 'ag-grid-community';
import { z } from 'zod';
import { apiQuery, sendJson } from '../../api/http';
import { environmentSchema } from '../../api/schemas';
import { useAction } from '../../api/mutations';
import { QueryState } from '../../components/QueryState';
import { gridTheme, queryString } from '../cards/grid';
import { computeDiff } from './diff';
import styles from './Usage.module.css';

const logSchema = z.object({
  id: z.number(),
  modelName: z.string(),
  modelType: z.enum(['CHAT', 'IMAGE', 'AUDIO']),
  operationType: z.string(),
  operationId: z.string().nullable(),
  inputTokens: z.number().nullable(),
  outputTokens: z.number().nullable(),
  inputCharacters: z.number().nullable(),
  imageCount: z.number().nullable(),
  costUsd: z.number(),
  processingTimeMs: z.number(),
  responseContent: z.string().nullable(),
  rating: z.number().nullable(),
  createdAt: z.string(),
});
type Log = z.infer<typeof logSchema>;
const responseSchema = z.object({ rows: z.array(logSchema), totalCount: z.number() });
const summarySchema = z.array(
  z.object({
    operationType: z.string(),
    modelName: z.string(),
    totalCalls: z.number(),
    ratedCalls: z.number(),
    averageRating: z.number().nullable(),
    totalCost: z.number(),
  })
);

export default function ModelUsage() {
  const client = useQueryClient();
  const notifications = useNotifications();
  const environment = useQuery(apiQuery('/api/environment', environmentSchema));
  const summary = useQuery(apiQuery('/api/model-usage-logs/summary', summarySchema));
  const [tab, setTab] = useState('Usage Logs');
  const [today] = useState(() => Date.now());
  const [date, setDate] = useState(() => new Date(today).toISOString().split('T')[0]);
  const [modelType, setModelType] = useState('');
  const [operationType, setOperationType] = useState('');
  const [modelName, setModelName] = useState('');
  const [expanded, setExpanded] = useState<number>();
  const [logs, setLogs] = useState<Log[]>([]);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState<string>();
  const filters = queryString({ date, modelType, operationType, modelName });
  const refresh = () => setRevision((value) => value + 1);
  const rate = useAction(
    ({ log, star }: { log: Log; star: number }) =>
      sendJson(`/api/model-usage-logs/${log.id}/rating`, 'PATCH', { rating: log.rating === star ? null : star }),
    refresh
  );
  const clear = useAction(
    () => sendJson(`/api/model-usage-logs?${filters}`, 'DELETE'),
    () => {
      setExpanded(undefined);
      setLogs([]);
      refresh();
    }
  );
  const datasource = useMemo<IDatasource>(
    () => ({
      getRows: (params) => {
        const sort = params.sortModel[0];
        const path = `/api/model-usage-logs?${filters}&${queryString({ startRow: params.startRow, endRow: params.endRow, sortField: sort?.colId, sortDirection: sort?.sort })}`;
        void client
          .fetchQuery({ ...apiQuery(path, responseSchema), queryKey: [path, String(revision)], staleTime: 0 })
          .then(
            (result) => {
              setError(undefined);
              setLogs((current) =>
                params.startRow === 0
                  ? result.rows
                  : [...current.filter((log) => !result.rows.some((item) => item.id === log.id)), ...result.rows]
              );
              params.successCallback(result.rows, result.totalCount);
            },
            (error: Error) => {
              setError(error.message);
              params.failCallback();
            }
          );
      },
    }),
    [client, filters, revision]
  );
  const group = (log: Log) => (log.operationId ? logs.filter((other) => other.operationId === log.operationId) : []);
  const primary = (log: Log) => {
    const members = group(log);
    return (
      members.find((member) => member.modelName === environment.data?.primaryModelByOperation[log.operationType]) ??
      members[0]
    );
  };
  const diff = (log: Log) => {
    const original = primary(log);
    return original && original.id !== log.id && original.responseContent !== null && log.responseContent !== null
      ? computeDiff(original.responseContent, log.responseContent)
      : [];
  };
  const columns: ColDef<Log>[] = [
    {
      headerName: '',
      colId: 'expand',
      width: 55,
      sortable: false,
      cellRenderer: ({ data }: ICellRendererParams<Log>) =>
        data?.modelType === 'CHAT' && data.responseContent ? <span aria-label="Show response">▸</span> : null,
    },
    {
      headerName: 'Time',
      field: 'createdAt',
      width: 170,
      valueFormatter: ({ value }) => (value ? new Date(value).toLocaleString() : ''),
    },
    { headerName: 'Type', field: 'modelType', width: 100 },
    {
      headerName: 'Model',
      field: 'modelName',
      minWidth: 180,
      flex: 1,
      cellRenderer: ({ data }: ICellRendererParams<Log>) =>
        data && (
          <span>
            {data.modelName}
            {group(data).length > 1 && primary(data)?.id === data.id && <span className={styles.primary}>primary</span>}
          </span>
        ),
    },
    { headerName: 'Operation', field: 'operationType', width: 150 },
    {
      headerName: 'Usage',
      colId: 'usage',
      width: 180,
      sortable: false,
      valueGetter: ({ data }) =>
        !data
          ? ''
          : data.modelType === 'CHAT'
            ? `${data.inputTokens ?? 0} / ${data.outputTokens ?? 0} tokens`
            : data.modelType === 'IMAGE'
              ? `${data.imageCount ?? 0} image(s)`
              : `${data.inputCharacters ?? 0} chars`,
    },
    {
      headerName: 'Diff',
      colId: 'diff',
      width: 110,
      sortable: false,
      cellRenderer: ({ data }: ICellRendererParams<Log>) => {
        if (!data) return null;
        const lines = diff(data);
        if (!lines.length) return null;
        const added = lines.filter((line) => line.type === 'added').length;
        const removed = lines.filter((line) => line.type === 'removed').length;
        return added || removed ? (
          <>
            <span className={styles.added}>+{added}</span> <span className={styles.removed}>-{removed}</span>
          </>
        ) : (
          <span>identical</span>
        );
      },
    },
    {
      headerName: 'Per $1',
      colId: 'perDollar',
      width: 100,
      sortable: false,
      valueGetter: ({ data }) =>
        data ? (data.costUsd > 0 ? Math.round(1 / data.costUsd).toLocaleString('en-US') : '—') : '',
    },
    {
      headerName: 'Seconds',
      field: 'processingTimeMs',
      width: 100,
      valueFormatter: ({ value }) => (value == null ? '' : String(value / 1000)),
    },
    {
      headerName: 'Rating',
      field: 'rating',
      width: 160,
      sortable: false,
      cellRenderer: ({ data }: ICellRendererParams<Log>) =>
        data?.modelType === 'CHAT' && (
          <div className={styles.rating}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className={styles.star}
                aria-label={`Rate ${star} stars`}
                aria-pressed={data.rating === star}
                disabled={rate.isPending}
                onClick={(event) => {
                  event.stopPropagation();
                  rate.mutate({ log: data, star });
                }}
              >
                {data.rating !== null && star <= data.rating ? '★' : '☆'}
              </button>
            ))}
          </div>
        ),
    },
  ];
  const expandedLog = logs.find((log) => log.id === expanded);
  const dateOptions = Array.from({ length: 30 }, (_, index) => {
    const value = new Date(today - index * 86400000).toISOString().split('T')[0];
    return {
      id: value,
      label:
        index === 0
          ? 'Today'
          : index === 1
            ? 'Yesterday'
            : new Date(value + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  });
  return (
    <div className={styles.page}>
      <title>Model Usage | Learn language</title>
      <h1>Model Usage Logs</h1>
      <p>Track AI model usage and costs across chat, image, and audio services.</p>
      <div role="tablist" aria-label="Model usage" className={styles.tabs}>
        {['Usage Logs', 'Model Summary'].map((label, index, labels) => (
          <button
            key={label}
            type="button"
            role="tab"
            id={`tab-${label.replaceAll(' ', '-')}`}
            aria-controls={`panel-${label.replaceAll(' ', '-')}`}
            aria-selected={tab === label}
            tabIndex={tab === label ? 0 : -1}
            onClick={() => setTab(label)}
            onKeyDown={(event) => {
              const next =
                event.key === 'Home'
                  ? labels[0]
                  : event.key === 'End'
                    ? labels.at(-1)
                    : event.key === 'ArrowRight'
                      ? labels[(index + 1) % labels.length]
                      : event.key === 'ArrowLeft'
                        ? labels[(index + labels.length - 1) % labels.length]
                        : undefined;
              if (next) {
                event.preventDefault();
                setTab(next);
                document.getElementById(`tab-${next.replaceAll(' ', '-')}`)?.focus();
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <section role="tabpanel" id="panel-Usage-Logs" aria-labelledby="tab-Usage-Logs" hidden={tab !== 'Usage Logs'}>
        <div className={styles.filters}>
          <Select
            label="Date"
            aria-label="Filter by date"
            selectedKey={date}
            onSelectionChange={(key) => {
              setDate(String(key));
              setExpanded(undefined);
            }}
            options={[{ id: '', label: 'All dates' }, ...dateOptions]}
          />
          <Select
            label="Type"
            aria-label="Filter by type"
            selectedKey={modelType}
            onSelectionChange={(key) => {
              setModelType(String(key));
              setExpanded(undefined);
            }}
            options={[{ id: '', label: 'All types' }, ...['CHAT', 'IMAGE', 'AUDIO'].map((id) => ({ id, label: id }))]}
          />
          <QueryState query={environment} label="Model filters">
            {(config) => (
              <Select
                label="Operation"
                aria-label="Filter by operation"
                selectedKey={operationType}
                onSelectionChange={(key) => {
                  setOperationType(String(key));
                  setExpanded(undefined);
                }}
                options={[
                  { id: '', label: 'All operations' },
                  ...config.allOperationTypes.map((item) => ({ id: item.code, label: item.displayName })),
                ]}
              />
            )}
          </QueryState>
          <Select
            label="Model"
            aria-label="Filter by model"
            selectedKey={modelName}
            onSelectionChange={(key) => {
              setModelName(String(key));
              setExpanded(undefined);
            }}
            options={[
              { id: '', label: 'All models' },
              ...Array.from(new Set(summary.data?.map((item) => item.modelName))).map((id) => ({ id, label: id })),
            ]}
          />
          {date && (
            <Button aria-label="Clear logs" tone="error" isDisabled={clear.isPending} onPress={() => clear.mutate()}>
              Clear logs
            </Button>
          )}
        </div>
        {error && (
          <p role="alert">
            {error}
            <Button onPress={refresh}>Retry</Button>
          </p>
        )}
        <div className={styles.grid}>
          <AgGridReact<Log>
            theme={gridTheme}
            columnDefs={columns}
            defaultColDef={{ sortable: true, resizable: true }}
            rowModelType="infinite"
            cacheBlockSize={100}
            maxBlocksInCache={10}
            datasource={datasource}
            getRowId={({ data }) => String(data.id)}
            onRowClicked={({ data }) => {
              if (data?.modelType === 'CHAT' && data.responseContent)
                setExpanded((current) => (current === data.id ? undefined : data.id));
            }}
          />
        </div>
        {expandedLog?.responseContent && (
          <section className={styles.response}>
            <h3>{diff(expandedLog).length ? 'Diff vs Primary' : 'Response'}</h3>
            <Button
              aria-label="Copy to clipboard"
              onPress={() => {
                void navigator.clipboard
                  .writeText(expandedLog.responseContent!)
                  .catch((error: Error) => notifications.error(error.message));
              }}
            >
              Copy to clipboard
            </Button>
            {diff(expandedLog).length ? (
              <pre>
                {diff(expandedLog).map((line, index) => (
                  <div key={index} className={styles[line.type]}>
                    {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '} {line.content}
                  </div>
                ))}
              </pre>
            ) : (
              <pre>{expandedLog.responseContent}</pre>
            )}
          </section>
        )}
      </section>
      <section
        role="tabpanel"
        id="panel-Model-Summary"
        aria-labelledby="tab-Model-Summary"
        hidden={tab !== 'Model Summary'}
      >
        <QueryState query={summary} label="Model summaries">
          {(items) =>
            items.length ? (
              Array.from(new Set(items.map((item) => item.operationType))).map((operation) => (
                <section key={operation}>
                  <h3>{operation}</h3>
                  <table className={styles.table} aria-label={`${operation} summary`}>
                    <thead>
                      <tr>
                        {['Model', 'Total Calls', 'Rated Calls', 'Avg Rating', 'Total Cost'].map((label) => (
                          <th key={label}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items
                        .filter((item) => item.operationType === operation)
                        .map((item) => (
                          <tr key={item.modelName}>
                            <td>{item.modelName}</td>
                            <td>{item.totalCalls}</td>
                            <td>{item.ratedCalls}</td>
                            <td>
                              {item.ratedCalls > 0 && item.averageRating !== null ? item.averageRating.toFixed(2) : '-'}
                            </td>
                            <td>${item.totalCost.toFixed(4)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </section>
              ))
            ) : (
              <>
                <h2>No model data yet</h2>
                <p>Model summaries will appear here once AI models are used and rated.</p>
              </>
            )
          }
        </QueryState>
      </section>
    </div>
  );
}
