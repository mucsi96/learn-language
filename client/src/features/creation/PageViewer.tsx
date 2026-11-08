import { useRef, useState } from 'react';
import { Button, LinkButton, Menu, MenuItem, MenuPopover, MenuTrigger, Select, TextField } from '@mucsi96/react-ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { apiQuery, sendJson } from '../../api/http';
import { QueryState } from '../../components/QueryState';
import { Icon } from '../../components/Icon';
import {
  pageSchema,
  extractCandidates,
  detectDuplicates,
  isBillingError,
  upload,
  type Candidate,
  type CardType,
  type Duplicate,
  type Region,
} from './api';
import { createCardsInBulk, createDraft, draftData, useCreationJob } from './pipeline';
import { CreationProgress, DuplicateReviewDialog, GrammarTopicDialog } from './Dialogs';
import { PendingPhoto } from './PendingPhoto';
import { PageCanvas } from './PageCanvas';
import { mergeCandidates, useViewerState } from './viewerState';
import styles from './Creation.module.css';
import viewerStyles from './PageViewer.module.css';

export function PageViewer() {
  const { sourceId, pageNumber } = useParams();
  if (!sourceId || !pageNumber) throw new Error('Missing source or page number');
  return <PageViewerSource key={sourceId} sourceId={sourceId} pageNumber={Number(pageNumber)} />;
}
function PageViewerSource({ sourceId, pageNumber }: { sourceId: string; pageNumber: number }) {
  const [searchParams] = useSearchParams();
  const documentId = searchParams.get('documentId');
  const navigate = useNavigate();
  const client = useQueryClient();
  const uploadInput = useRef<HTMLInputElement>(null);
  const [state, updateState] = useViewerState(sourceId);
  const { cardType, regions, extractedRegions, candidates, ignored, grammarTopic } = state;
  const [search, setSearch] = useState('');
  const [duplicates, setDuplicates] = useState<Duplicate[] | null>(null);
  const [progressOpen, setProgressOpen] = useState(false);
  const [topicOpen, setTopicOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const query = useQuery(
    apiQuery(
      `/api/source/${sourceId}/page/${pageNumber}${documentId ? `?documentId=${encodeURIComponent(documentId)}` : ''}`,
      pageSchema
    )
  );
  const page = query.data;
  const type = cardType || (page?.cardTypes.length === 1 ? page.cardTypes[0] : undefined);
  const topics = useQuery({
    ...apiQuery('/api/grammar-topics', z.array(z.object({ id: z.number(), name: z.string() }))),
    enabled: type === 'grammar',
  });
  const job = useCreationJob();
  const active = candidates.filter((item) => !item.exists && !item.error && !ignored.includes(item.id));
  const action = useMutation({
    mutationFn: async (work: () => Promise<void>) => {
      await work();
      await client.invalidateQueries();
    },
  });
  const href = (number: number, doc = documentId) =>
    `/sources/${sourceId}/page/${Math.max(1, page?.pageCount ? Math.min(number, page.pageCount) : number)}${doc ? `?documentId=${encodeURIComponent(doc)}` : ''}`;
  const ignore = (id: string) => updateState((current) => ({ ...current, ignored: [...current.ignored, id] }));
  const known = (item: Candidate) =>
    action.mutate(async () => {
      await sendJson('/api/known-words/import', 'POST', { text: item.word });
      ignore(item.id);
    });
  const performCreation = async (items: Candidate[], topic = grammarTopic) => {
    if (!items.length) return;
    if (!type) throw new Error('Select a card type');
    if (type === 'grammar' && !topic.trim()) throw new Error('Choose a grammar topic before creating cards');
    setProgressOpen(true);
    const result = await createCardsInBulk(sourceId, pageNumber, type, items, topic.trim() || undefined, (id) =>
      updateState((current) => ({
        ...current,
        candidates: current.candidates.map((item) => (item.id === id ? { ...item, exists: true } : item)),
      }))
    ).catch((error) => {
      setProgressOpen(false);
      throw error;
    });
    if (result.succeeded > 0 && extractedRegions.length) {
      await sendJson(`/api/source/${sourceId}/extraction-regions`, 'POST', {
        documentId: page?.documentId,
        regions: extractedRegions,
      });
      updateState((current) => ({ ...current, extractedRegions: [] }));
    }
  };
  const prepareCreation = (topic = grammarTopic) =>
    action.mutate(async () => {
      const found = await detectDuplicates(
        sourceId,
        active.map((item) => item.id)
      ).catch((error) => {
        if (isBillingError(error)) throw error;
        setNotice('Duplicate detection failed; continuing without it.');
        return [];
      });
      if (found.length) setDuplicates(found);
      else await performCreation(active, topic);
    });
  const extract = () =>
    action.mutate(async () => {
      if (!type) throw new Error('Select a card type');
      const items = await extractCandidates(sourceId, type, regions);
      updateState((current) => ({
        ...current,
        candidates: mergeCandidates(current.candidates, items),
        extractedRegions: [...current.extractedRegions, ...regions],
        regions: [],
      }));
    });
  const handleUpload = (file: File) =>
    action.mutate(async () => {
      const image = page ? page.sourceType === 'images' : /\.(png|jpe?g|gif|webp)$/i.test(file.name);
      if (!(image ? /\.(png|jpe?g|gif|webp)$/i : /\.pdf$/i).test(file.name))
        throw new Error(
          image ? 'Only image files (PNG, JPG, JPEG, GIF, WEBP) are allowed' : 'Only PDF files are allowed'
        );
      const result = await upload(`/api/source/${sourceId}/documents`, file);
      if (result.documentId !== undefined) navigate(href(1, String(result.documentId)));
      else if (result.pageNumber !== undefined) navigate(href(result.pageNumber, null));
      else await query.refetch();
    });
  return (
    <section className={`${styles.page} ${viewerStyles.page}`}>
      <input
        ref={uploadInput}
        hidden
        aria-label={page?.sourceType === 'pdf' ? 'Upload PDF file' : 'Upload image file'}
        type="file"
        accept={page?.sourceType === 'pdf' ? 'application/pdf' : 'image/png,image/jpeg,image/gif,image/webp'}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleUpload(file);
          event.target.value = '';
        }}
      />
      <QueryState query={query} label="Document page">
        {(loaded) => (
          <>
            <h1>{loaded.sourceName}</h1>
            <div className={viewerStyles.toolbar} role="region" aria-label="Document controls">
              <nav className={viewerStyles.pagination} aria-label="Page navigation">
                <LinkButton
                  variant="icon"
                  aria-label="Previous page"
                  isDisabled={pageNumber <= 1}
                  href={href(pageNumber - 1)}
                >
                  <Icon name="previous" />
                </LinkButton>
                <label className={viewerStyles.pageNumber}>
                  Page
                  <input
                    aria-label="Page"
                    key={pageNumber}
                    type="number"
                    defaultValue={pageNumber}
                    min={1}
                    max={loaded.pageCount ?? undefined}
                    onBlur={(event) => {
                      if (Number.isFinite(event.target.valueAsNumber) && event.target.valueAsNumber !== pageNumber)
                        navigate(href(event.target.valueAsNumber));
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') event.currentTarget.blur();
                    }}
                  />
                </label>
                <span>of {loaded.pageCount ?? '—'}</span>
                <LinkButton
                  variant="icon"
                  aria-label="Next page"
                  isDisabled={loaded.pageCount != null && pageNumber >= loaded.pageCount}
                  href={href(pageNumber + 1)}
                >
                  <Icon name="next" />
                </LinkButton>
              </nav>
              {loaded.documents && loaded.documents.length > 1 && (
                <Select
                  label="Document"
                  options={loaded.documents.map((document) => ({ id: String(document.id), label: document.fileName }))}
                  selectedKey={String(loaded.documentId)}
                  onSelectionChange={(key) => {
                    updateState((current) => ({ ...current, regions: [], extractedRegions: [], candidates: [] }));
                    navigate(href(1, String(key)));
                  }}
                />
              )}
              <div className={viewerStyles.actions}>
                <LinkButton href={`/sources/${sourceId}/cards`} variant="outlined">
                  <Icon name="cards" />
                  Cards
                </LinkButton>
                <Button
                  variant="outlined"
                  isDisabled={action.isPending}
                  aria-label={loaded.sourceType === 'images' ? 'Upload image' : 'Add PDF document'}
                  onPress={() => uploadInput.current?.click()}
                >
                  <Icon name="upload" />
                  {loaded.sourceType === 'images' ? 'Upload image' : 'Add PDF'}
                </Button>
                {loaded.sourceType === 'images' && loaded.hasImage && (
                  <Button tone="error" isDisabled={action.isPending} onPress={() => action.mutate(() => sendJson(`/api/source/${sourceId}/documents/${pageNumber}`, 'DELETE'))}>
                    Delete image
                  </Button>
                )}
              </div>
              {loaded.cardTypes.length > 1 && (
                <Select
                  label="Card type"
                  options={loaded.cardTypes.map((value) => ({
                    id: value,
                    label: value === 'speech' ? 'Sentence' : value[0].toUpperCase() + value.slice(1),
                  }))}
                  selectedKey={type ?? null}
                  isDisabled={candidates.length > 0 || action.isPending}
                  onSelectionChange={(key) => updateState((current) => ({ ...current, cardType: key as CardType }))}
                />
              )}
            </div>
            {loaded.sourceType === 'images' && loaded.cardTypes.includes('grammar') && (
              <PendingPhoto
                sourceId={sourceId}
                onCandidates={(items) =>
                  updateState((current) => ({
                    ...current,
                    candidates: [
                      ...current.candidates,
                      ...items.filter((item) => !current.candidates.some((value) => value.id === item.id)),
                    ],
                    cardType: 'grammar',
                  }))
                }
              />
            )}
            <PageCanvas
              page={loaded}
              regions={regions}
              extractedRegions={extractedRegions}
              candidates={candidates.filter((item) => !ignored.includes(item.id))}
              disabled={action.isPending}
              onUpload={handleUpload}
              onIgnore={ignore}
              onSelection={(region) =>
                updateState((current) => ({ ...current, regions: [...current.regions, region] }))
              }
            />
            <details>
              <summary>Add extraction region with keyboard</summary>
              <RegionForm
                pageNumber={pageNumber}
                onAdd={(region) => updateState((current) => ({ ...current, regions: [...current.regions, region] }))}
              />
            </details>
            {regions.length > 0 && (
              <>
                <ol>
                  {regions.map((region, index) => (
                    <li key={index}>
                      Selection {index + 1}, page {region.pageNumber}{' '}
                      <Button
                        variant="text"
                        onPress={() =>
                          updateState((current) => ({
                            ...current,
                            regions: current.regions.filter((_, i) => i !== index),
                          }))
                        }
                      >
                        Remove selection {index + 1}
                      </Button>
                    </li>
                  ))}
                </ol>
                <div className={styles.actions}>
                  <Button isDisabled={!type || action.isPending} onPress={extract}>
                    Confirm selection
                  </Button>
                  <Button
                    variant="text"
                    isDisabled={action.isPending}
                    onPress={() =>
                      updateState((current) => ({
                        ...current,
                        regions: [],
                        extractedRegions: [],
                        candidates: current.candidates.filter((item) => !item.selectionRegions),
                      }))
                    }
                  >
                    Cancel selection
                  </Button>
                </div>
              </>
            )}
            {action.error && (
              <p role="alert" className={styles.error}>
                {action.error.message}
              </p>
            )}
            {notice && <p role="status">{notice}</p>}
            {candidates.length > 0 && (
              <>
                {loaded.formatType === 'flowingText' && active.length > 0 && (
                  <section role="region" aria-label="Extracted items" className={styles.actions}>
                    {active.map((item) => (
                      <MenuTrigger key={item.id}>
                        <Button variant="outlined">{item.word ?? item.sentence ?? item.frontText}</Button>
                        <MenuPopover>
                          <Menu aria-label={`Actions for ${item.word ?? item.sentence ?? item.id}`}>
                            {type === 'vocabulary' && (
                              <MenuItem onAction={() => known(item)}>Add to known words</MenuItem>
                            )}
                            <MenuItem onAction={() => ignore(item.id)}>Ignore once</MenuItem>
                          </Menu>
                        </MenuPopover>
                      </MenuTrigger>
                    ))}
                  </section>
                )}
                <h2>Extracted candidates</h2>
                <TextField label="Search candidates" value={search} onChange={setSearch} />
                <ul className={styles.list}>
                  {candidates
                    .filter(
                      (item) =>
                        !ignored.includes(item.id) &&
                        (item.word ?? item.sentence ?? item.id).toLowerCase().includes(search.toLowerCase())
                    )
                    .map((item) => (
                      <li key={item.id}>
                        <strong>Candidate: {item.word ?? item.sentence ?? item.frontText}</strong>
                        {item.error && <p role="alert">{item.error}</p>}
                        {item.hint && <p>{item.hint}</p>}
                        {item.examples?.map((example, index) => (
                          <p key={index}>{example}</p>
                        ))}
                        {item.warning && <p>Possible duplicate word</p>}
                        {item.exists ? (
                          <Link to={`/sources/${sourceId}/page/${pageNumber}/cards/${item.id}`}>Edit card</Link>
                        ) : (
                          <div className={styles.actions}>
                            <Button
                              variant="outlined"
                              isDisabled={action.isPending || !type || Boolean(item.error)}
                              onPress={() =>
                                action.mutate(async () => {
                                  if (!type) throw new Error('Select card type');
                                  await createDraft(
                                    sourceId,
                                    pageNumber,
                                    type,
                                    item.id,
                                    draftData(item, type, grammarTopic)
                                  );
                                  updateState((current) => ({
                                    ...current,
                                    candidates: current.candidates.map((value) =>
                                      value.id === item.id ? { ...value, exists: true } : value
                                    ),
                                  }));
                                  navigate(`/sources/${sourceId}/page/${pageNumber}/cards/${item.id}`);
                                })
                              }
                            >
                              Create draft
                            </Button>
                            <Button variant="text" onPress={() => ignore(item.id)}>
                              Ignore once
                            </Button>
                            {type === 'vocabulary' && (
                              <Button variant="text" isDisabled={action.isPending} onPress={() => known(item)}>
                                Add to known words
                              </Button>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                </ul>
                <div className={styles.actions}>
                  {active.length > 0 && regions.length === 0 && (
                    <Button
                      aria-label="Create cards in bulk"
                      isDisabled={action.isPending || job.isProcessing}
                      onPress={() => {
                        if (type === 'grammar') setTopicOpen(true);
                        else prepareCreation();
                      }}
                    >
                      Create {active.length} Cards
                    </Button>
                  )}
                  <Button
                    variant="text"
                    isDisabled={action.isPending || job.isProcessing}
                    onPress={() =>
                      updateState((current) => ({ ...current, candidates: [], ignored: [], extractedRegions: [] }))
                    }
                  >
                    Clear extraction
                  </Button>
                  {ignored.length > 0 && (
                    <Button variant="text" onPress={() => updateState((current) => ({ ...current, ignored: [] }))}>
                      Restore ignored candidates
                    </Button>
                  )}
                </div>
              </>
            )}
            {job.progress.length > 0 && (
              <Button variant="outlined" onPress={() => setProgressOpen(true)}>
                View creation progress
              </Button>
            )}
          </>
        )}
      </QueryState>
      {progressOpen && <CreationProgress onClose={() => setProgressOpen(false)} />}
      {topicOpen && (
        <GrammarTopicDialog
          topics={topics.data ?? []}
          error={topics.error?.message}
          onClose={(topic) => {
            setTopicOpen(false);
            if (topic) {
              updateState((current) => ({ ...current, grammarTopic: topic }));
              prepareCreation(topic);
            }
          }}
        />
      )}
      {duplicates && (
        <DuplicateReviewDialog
          duplicates={duplicates}
          sourceId={sourceId}
          pageNumber={pageNumber}
          onClose={(ids) => {
            setDuplicates(null);
            if (ids) {
              updateState((current) => ({ ...current, ignored: [...current.ignored, ...ids] }));
              action.mutate(() => performCreation(active.filter((item) => !ids.includes(item.id))));
            }
          }}
        />
      )}
    </section>
  );
}
function RegionForm({ pageNumber, onAdd }: { pageNumber: number; onAdd: (region: Region) => void }) {
  return (
    <form
      className={styles.actions}
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        onAdd({
          pageNumber,
          x: Number(form.get('x')),
          y: Number(form.get('y')),
          width: Number(form.get('width')),
          height: Number(form.get('height')),
        });
      }}
    >
      {['x', 'y', 'width', 'height'].map((name) => (
        <label className={styles.field} key={name}>
          {name}
          <input name={name} type="number" min={name === 'x' || name === 'y' ? 0 : 1} required />
        </label>
      ))}
      <Button type="submit">Add selection</Button>
    </form>
  );
}
