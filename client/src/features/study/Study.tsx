import { useEffect, useState } from 'react';
import { useIsMutating, useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import {
  Button,
  Card as Panel,
  LinkButton,
  Menu,
  MenuItem,
  MenuPopover,
  MenuTrigger,
  ProgressBar,
  TextField,
} from '@mucsi96/react-ui';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { apiQuery, request, sendJson } from '../../api/http';
import { cardSchema } from '../../api/cards';
import type { Card } from '../../api/cards';
import { dueCountSchema, environmentSchema, sourceSchema } from '../../api/schemas';
import { CardActions } from './CardActions';
import { Celebration } from './Celebration';
import { useCardAudio } from './audio';
import { useAction } from '../../api/mutations';
import { QueryState } from '../../components/QueryState';
import { StateBadge } from '../../components/StateBadge';
import { Markdown } from '../../components/Markdown';
import { gradeCard } from './scheduler';
import { startPomodoro, usePomodoroDeadline } from './pomodoro';
import styles from './Study.module.css';

const sessionSchema = z.object({ sessionId: z.string(), pomodoroEndsAt: z.number() }).nullable();
const turnSchema = z
  .object({
    card: cardSchema,
    learningPartnerId: z.number().nullable(),
    turnName: z.string(),
    studyMode: z.enum(['SOLO', 'WITH_PARTNER']),
  })
  .nullable();
const personSchema = z.object({
  name: z.string(),
  totalDurationMs: z.number(),
  averageDurationMs: z.number(),
  goodCount: z.number(),
  badCount: z.number(),
});
const statsSchema = personSchema
  .omit({ name: true })
  .extend({ studyMode: z.string(), personStats: z.array(personSchema) })
  .nullable();

export default function Study() {
  const { sourceId } = useParams();
  if (!sourceId) throw new Error('Missing source ID');
  return <StudySession key={sourceId} sourceId={sourceId} />;
}

function StudySession({ sourceId }: { sourceId: string }) {
  const path = `/api/source/${sourceId}/study-session`;
  const session = useQuery(apiQuery(path, sessionSchema));
  const [active, setActive] = useState(false);
  const [generation, setGeneration] = useState(0);
  const mutations = useIsMutating();
  const navigate = useNavigate();
  const sources = useQuery(apiQuery('/api/sources', z.array(sourceSchema)));
  const current = useQuery({ ...apiQuery(`${path}/current-card`, turnSchema), enabled: active });
  const due = useQuery(apiQuery('/api/sources/due-cards-count', z.array(dueCountSchema)));
  const start = useAction(async (restart: boolean) => {
    if (restart) window.dispatchEvent(new Event('study-stop-audio'));
    const response = await request(`${path}${restart ? '/restart' : ''}`, { method: 'POST' });
    const created = sessionSchema.parse(response.status === 204 ? null : await response.json());
    if (created) {
      startPomodoro(restart);
      setActive(true);
      setGeneration((value) => value + 1);
    }
  });
  const controls = (
    <div className={styles.headerControls}>
      {active && current.data?.studyMode === 'WITH_PARTNER' && (
        <span role="status" aria-label="Current turn">
          {current.data.turnName}
        </span>
      )}
      <div role="group" aria-label="Due cards" className={styles.dots}>
        {due.data
          ?.filter((count) => count.sourceId === sourceId)
          .flatMap((count) =>
            Array.from({ length: count.count }, (_, index) => (
              <StateBadge key={`${count.state}-${index}`} state={count.state} />
            ))
          )}
      </div>
      {sources.data && (
        <MenuTrigger>
          <Button variant="outlined" className={styles.sourceButton}>
            {sources.data.find((source) => source.id === sourceId)?.name}
          </Button>
          <MenuPopover>
            <Menu aria-label="Study source">
              {sources.data.map((source) => (
                <MenuItem
                  key={source.id}
                  textValue={source.name}
                  aria-label={source.name}
                  onAction={() => navigate(`/sources/${source.id}/study`)}
                >
                  <span className={styles.sourceOption}>
                    {source.name}
                    {due.data
                      ?.filter((count) => count.sourceId === source.id)
                      .map((count) => (
                        <StateBadge key={count.state} state={count.state} count={count.count} />
                      ))}
                  </span>
                </MenuItem>
              ))}
            </Menu>
          </MenuPopover>
        </MenuTrigger>
      )}
      <Pomodoro active={active} onRestart={() => start.mutate(true)} pending={mutations > 0 || current.isFetching} />
    </div>
  );
  const header = document.getElementById('study-header-controls');
  return (
    <div className={styles.study}>
      {header && createPortal(controls, header)}
      <QueryState query={session} label="Checking study session">
        {(existing) =>
          !active ? (
            <div className={styles.center}>
              <h2>{existing ? 'Welcome back!' : 'Ready to study?'}</h2>
              <p>
                {existing
                  ? 'You have an ongoing study session from today.'
                  : 'Click start to begin your study session.'}
              </p>
              <Button
                aria-label={existing ? 'Continue study session' : 'Start study session'}
                onPress={() => start.mutate(false)}
                isDisabled={start.isPending}
              >
                {existing ? 'Continue' : 'Start'}
              </Button>
              {existing && <SessionStats path={path} />}
            </div>
          ) : (
            <QueryState query={current} label="Loading flashcard">
              {(turn) =>
                turn ? (
                  <>
                    <StudyCard
                      key={`${turn.card.id}-${turn.learningPartnerId}-${turn.card.reps}-${generation}`}
                      card={turn.card}
                      partnerId={turn.learningPartnerId}
                      path={path}
                      onProcessed={() => setGeneration((value) => value + 1)}
                    />
                  </>
                ) : (
                  <div className={styles.center}>
                    <Celebration />
                    <h2>All caught up!</h2>
                    <p>No cards are due for review right now.</p>
                    <p>Great job keeping up with your studies! 🎉</p>
                    <SuggestedKnown
                      sourceId={sourceId}
                      count={sources.data?.find((source) => source.id === sourceId)?.suggestedKnownCardCount}
                    />
                    <SessionStats path={path} />
                  </div>
                )
              }
            </QueryState>
          )
        }
      </QueryState>
    </div>
  );
}

function Pomodoro({ onRestart, pending, active }: { onRestart: () => void; pending: boolean; active: boolean }) {
  const deadline = usePomodoroDeadline();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const remaining = deadline === null ? null : Math.max(0, Math.ceil((deadline - now) / 1000));
  return (
    <>
      <Button
        variant="text"
        aria-label={active ? 'Start new study session' : remaining === null ? 'Start Pomodoro' : 'Restart Pomodoro'}
        onPress={active ? onRestart : () => startPomodoro(true)}
        isDisabled={pending}
      >
        {remaining === null ? 'Start Pomodoro' : 'Restart'}
      </Button>
      {remaining !== null && (
        <ProgressBar
          label="Study Pomodoro"
          value={Math.max(0, (1 - remaining / 1500) * 100)}
          className={`${styles.pomodoro} ${remaining === 0 ? styles.expired : ''}`}
        />
      )}
      {remaining === 0 && <span role="status">Time for a break!</span>}
    </>
  );
}

function StudyCard({
  card,
  partnerId,
  path,
  onProcessed,
}: {
  card: Card;
  partnerId: number | null;
  path: string;
  onProcessed: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [shownAt] = useState(() => Date.now());
  const [duration, setDuration] = useState<number>();
  const [answer, setAnswer] = useState('');
  const environment = useQuery(apiQuery('/api/environment', environmentSchema));
  const grade = useAction((value: 'Again' | 'Good') => {
    window.dispatchEvent(new Event('study-stop-audio'));
    return sendJson(`/api/card/${card.id}`, 'PUT', {
      ...gradeCard(card, value),
      learningPartnerId: partnerId,
      reviewDuration: duration ?? null,
    });
  });
  const reveal = () => {
    if (!revealed) setDuration(Date.now() - shownAt);
    setRevealed((value) => !value);
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.isComposing ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        grade.isPending ||
        document.querySelector('[role="dialog"],[role="menu"]') ||
        target?.isContentEditable ||
        target?.closest('input,select,textarea,[role="textbox"],[role="dialog"]')
      )
        return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (['h', 'l'].includes(key) || (key === 'Enter' && !target?.closest('button,a'))) {
        event.preventDefault();
        if (!revealed) setDuration(Date.now() - shownAt);
        setRevealed((value) => !value);
      } else if (revealed && ['j', 'k', 'Red', 'Green'].includes(key)) {
        event.preventDefault();
        grade.mutate(['j', 'Red'].includes(key) ? 'Again' : 'Good');
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [grade, revealed, shownAt]);
  const example = card.data.examples?.find((example) => example.isSelected);
  const language = revealed ? 'de' : 'hu';
  const texts =
    card.type === 'grammar'
      ? revealed
        ? [example?.de?.replace(/\[([^\]]+)\]/g, '$1')]
        : []
      : [
          card.type === 'vocabulary' ? (revealed ? card.data.word : card.data.translation?.hu) : undefined,
          example?.[language],
        ];
  useCardAudio(card, texts, revealed || environment.data?.frontAudioDisabled === false);
  const gender =
    revealed && card.data.gender
      ? (
          {
            MASCULINE: { name: 'Masculine', color: '#2196f3' },
            FEMININE: { name: 'Feminine', color: '#f44336' },
            NEUTER: { name: 'Neuter', color: '#4caf50' },
          } as Record<string, { name: string; color: string }>
        )[card.data.gender]
      : undefined;
  return (
    <>
      <div className={styles.cardViewport}>
        <Panel
          className={`${styles.card} ${card.type === 'vocabulary' || card.type === 'speech' ? styles.imageCard : ''}`}
          role="article"
          aria-label="Flashcard"
          onClick={(event) => {
            if (!grade.isPending && !(event.target as HTMLElement).closest('input,button,a,textarea,select')) reveal();
          }}
        >
          {(card.type === 'vocabulary' || card.type === 'speech') && (
            <div className={styles.images}>
              {example?.images
                ?.filter((image) => image.isFavorite)
                .map((image) => (
                  <img key={image.id} src={`/api/image/${image.id}`} alt={example[language] ?? ''} />
                ))}
            </div>
          )}
          <div className={styles.content}>
            <StateBadge state={card.state} />
            {card.type === 'simple' ? (
              <>
                <div className={styles.toolbar}>
                  {card.data.category && <span aria-label="Category">{card.data.category}</span>}
                  {card.data.topic && <span aria-label="Topic">{card.data.topic}</span>}
                </div>
                {card.data.frontText && <Markdown label="Front" text={card.data.frontText} />}
                {card.source.typingPractice && !revealed && (
                  <TextField
                    className={styles.answerField}
                    label="Your answer"
                    autoFocus
                    value={answer}
                    onChange={setAnswer}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        reveal();
                      }
                    }}
                  />
                )}
                {revealed && (
                  <>
                    {answer.trim() && <AnswerCheck card={card} answer={answer.trim()} />}
                    <hr />
                    {card.data.backText && <Markdown label="Back" text={card.data.backText} />}
                  </>
                )}
              </>
            ) : card.type === 'grammar' ? (
              <>
                {card.data.grammarTopic && <span aria-label="Grammar topic">{card.data.grammarTopic}</span>}
                {card.data.hint && <p aria-label="Hint">{card.data.hint}</p>}
                <p aria-label="Hungarian translation">{example?.hu}</p>
                <p className={styles.sentence}>
                  {example?.de?.split(/(\[[^\]]+\])/g).map((part, index) =>
                    part.startsWith('[') ? (
                      <span
                        key={index}
                        role="group"
                        aria-label={revealed ? 'Grammar answer' : 'Missing word'}
                        className={revealed ? styles.highlight : styles.masked}
                      >
                        {revealed ? part.slice(1, -1) : '____'}
                      </span>
                    ) : (
                      part
                    )
                  )}
                </p>
              </>
            ) : (
              <>
                {card.type === 'vocabulary' && (
                  <>
                    {card.data.type && (
                      <span aria-label="Word type">
                        {
                          (
                            {
                              VERB: 'Ige',
                              NOUN: 'Főnév',
                              ADJECTIVE: 'Melléknév',
                              ADVERB: 'Határozószó',
                              PRONOUN: 'Névmás',
                              PREPOSITION: 'Elöljárószó',
                              CONJUNCTION: 'Kötőszó',
                              INTERJECTION: 'Indulatszó',
                              ARTICLE: 'Névelő',
                              NUMERAL: 'Számnév',
                              DETERMINER: 'Determináns',
                              EXPRESSION: 'Kifejezés',
                              OTHER: 'Egyéb',
                            } as Record<string, string>
                          )[card.data.type]
                        }
                      </span>
                    )}
                    <h2 style={{ color: gender?.color }}>{revealed ? card.data.word : card.data.translation?.hu}</h2>
                    {gender && <span className={styles.srOnly}>Gender: {gender.name}</span>}
                    {revealed && !!card.data.forms?.length && <p>{card.data.forms.join(', ')}</p>}
                  </>
                )}
                <p className={styles.sentence}>{example?.[language]}</p>
              </>
            )}
            <Button variant="text" onPress={reveal}>
              {revealed ? 'Hide answer' : 'Reveal answer'}
            </Button>
          </div>
        </Panel>
      </div>
      <div className={styles.grading}>
        {revealed && (
          <>
            <Button variant="raised" tone="error" onPress={() => grade.mutate('Again')} isDisabled={grade.isPending}>
              Incorrect
            </Button>
            <Button variant="raised" tone="success" onPress={() => grade.mutate('Good')} isDisabled={grade.isPending}>
              Correct
            </Button>
          </>
        )}
        <CardActions card={card} path={path} disabled={grade.isPending} onProcessed={onProcessed} />
      </div>
    </>
  );
}

function SuggestedKnown({ sourceId, count }: { sourceId: string; count: number | undefined }) {
  const [marked, setMarked] = useState<number>();
  const action = useAction(async () => {
    const response = await request(`/api/source/${sourceId}/card-ids?suggestedKnown=true`);
    const ids = z.array(z.string()).parse(await response.json());
    if (ids.length) await sendJson('/api/cards/mark-known', 'PUT', ids);
    setMarked(ids.length);
  });
  return marked !== undefined ? (
    <p role="status">
      {marked} {marked === 1 ? 'word' : 'words'} marked as known
    </p>
  ) : count ? (
    <Button onPress={() => action.mutate()} isDisabled={action.isPending}>
      Mark {count} {count === 1 ? 'word' : 'words'} as known
    </Button>
  ) : null;
}

function AnswerCheck({ card, answer }: { card: Card; answer: string }) {
  const environment = useQuery(apiQuery('/api/environment', environmentSchema));
  const model = environment.data?.primaryModelByOperation.answer_check;
  const query = useQuery({
    queryKey: ['answer-check', card.id, answer, model],
    enabled: !!model,
    queryFn: async ({ signal }) => {
      const response = await request(`/api/card/${card.id}/check-answer?model=${encodeURIComponent(model!)}`, {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer }),
      });
      return z.object({ correct: z.boolean(), explanation: z.string().nullable() }).parse(await response.json());
    },
  });
  return (
    <div aria-label="Your answer">
      <span className={styles.typedAnswer}>{answer}</span>
      {query.data?.correct ? (
        <span role="img" aria-label="Correct answer">
          ✓
        </span>
      ) : (
        query.data && <p role="alert">{query.data.explanation ?? 'Your answer does not match the expected answer.'}</p>
      )}
      {(query.isError || (environment.isSuccess && !model)) && <p role="alert">Could not check your answer.</p>}
    </div>
  );
}

function SessionStats({ path }: { path: string }) {
  const stats = useQuery(apiQuery(`${path}/stats`, statsSchema));
  return (
    <QueryState query={stats} label="Loading session statistics">
      {(data) =>
        data && (
          <section aria-label="Session statistics">
            <h2>Session statistics</h2>
            {data.studyMode === 'WITH_PARTNER' ? (
              data.personStats.map((person) => (
                <div role="group" aria-label={`${person.name} statistics`} key={person.name}>
                  <h3>{person.name}</h3>
                  <StatsGrid data={person} name={person.name} />
                </div>
              ))
            ) : (
              <StatsGrid data={data} />
            )}
            {data.badCount > 0 && (
              <LinkButton
                href={`${path}/struggled-cards.pdf`}
                download="struggled-cards.pdf"
                aria-label="Export struggled cards as PDF"
              >
                Export struggled cards
              </LinkButton>
            )}
          </section>
        )
      }
    </QueryState>
  );
}

function StatsGrid({
  data,
  name,
}: {
  data: z.infer<typeof personSchema> | Omit<z.infer<typeof personSchema>, 'name'>;
  name?: string;
}) {
  const duration = (ms: number) => {
    const seconds = Math.round(ms / 1000);
    return seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
  };
  const total = data.goodCount + data.badCount;
  const accuracy = total ? Math.round((data.goodCount / total) * 100) : 0;
  return (
    <>
      <div className={styles.stats}>
        {[
          ['Total time', duration(data.totalDurationMs)],
          ['Average per card', duration(data.averageDurationMs)],
          ['Good reviews', data.goodCount],
          ['Struggled reviews', data.badCount],
        ].map(([label, value]) => (
          <div role="group" aria-label={String(label)} key={label}>
            <span aria-label="value">{value}</span>
            <p>{label}</p>
          </div>
        ))}
      </div>
      <div role="group" aria-label="Accuracy">
        <span aria-label="value">{accuracy}%</span>
        <ProgressBar label={name ? `${name} accuracy` : 'Accuracy'} value={accuracy} />
      </div>
    </>
  );
}
