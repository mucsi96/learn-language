import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, useNotifications } from '@mucsi96/react-ui';
import { z } from 'zod';
import { cardSchema, type Card, type CardData } from '../../api/cards';
import { apiQuery, sendJson } from '../../api/http';
import { useAction } from '../../api/mutations';
import { environmentSchema } from '../../api/schemas';
import { QueryState } from '../../components/QueryState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { createAudioInBatch, getAudioItems, useCreationJob } from '../creation/pipeline';
import { usageSchema } from '../creation/api';
import { CreationProgress } from '../creation/Dialogs';
import { normalizeCardData } from '../creation/cardValidation';
import { ReviewEditor } from './ReviewEditor';
import { canReview } from './readiness';
import styles from './Review.module.css';

export default function InReviewCards() {
  const cards = useQuery(apiQuery('/api/cards/readiness/IN_REVIEW', z.array(cardSchema)));
  return (
    <div className={styles.page}>
      <title>Cards In Review | Learn language</title>
      <h1>Cards In Review</h1>
      <QueryState query={cards} label="Cards in review">
        {(items) => <ReviewSession initialCards={items} />}
      </QueryState>
    </div>
  );
}

function ReviewSession({ initialCards }: { initialCards: Card[] }) {
  const [cards, setCards] = useState(initialCards);
  const [reviewed, setReviewed] = useState<readonly string[]>([]);
  const remaining = cards.filter((card) => !reviewed.includes(card.id)).length;
  return (
    <>
      <div className={styles.list}>
        {cards.length ? (
          cards.map((card) => (
            <ReviewCard
              key={card.id}
              card={card}
              onReviewed={() => setReviewed((ids) => (ids.includes(card.id) ? ids : [...ids, card.id]))}
              onDeleted={() => setCards((items) => items.filter((item) => item.id !== card.id))}
            />
          ))
        ) : (
          <h2>No cards in review</h2>
        )}
      </div>
      <div className={styles.progress}>
        {remaining > 0 && <span aria-label={`Remaining cards: ${remaining}`}>{remaining}</span>}
        <BatchAudioButton />
      </div>
    </>
  );
}

export function ReviewCard({
  card,
  onReviewed,
  onDeleted,
}: {
  card: Card;
  onReviewed: () => void;
  onDeleted: () => void;
}) {
  const notifications = useNotifications();
  const [data, setData] = useState<CardData>(card.data);
  const [saved, setSaved] = useState<CardData>(card.data);
  const [reviewed, setReviewed] = useState(card.readiness === 'REVIEWED');
  const [deleting, setDeleting] = useState(false);
  const element = useRef<HTMLElement>(null);
  const inFlight = useRef(false);
  const eligible = !reviewed && canReview({ type: card.type, data });
  const save = useAction(async (review: boolean) => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await sendJson(`/api/card/${encodeURIComponent(card.id)}`, 'PUT', {
        data: normalizeCardData(card.type, data),
        ...(review ? { readiness: 'REVIEWED' } : {}),
      });
      setSaved(data);
      if (review) {
        setReviewed(true);
        onReviewed();
        notifications.success('Card marked as reviewed');
      }
    } finally {
      inFlight.current = false;
    }
  });
  const remove = useAction(
    () => sendJson(`/api/card/${encodeURIComponent(card.id)}`, 'DELETE'),
    () => {
      notifications.success('Card deleted');
      onDeleted();
    }
  );
  const autoSave = useRef(() => {});
  useEffect(() => {
    autoSave.current = () => {
      if (reviewed || inFlight.current || save.isPending) return;
      if (eligible) save.mutate(true);
      else if (data !== saved) save.mutate(false);
    };
  }, [reviewed, eligible, data, saved, save]);
  useEffect(() => {
    const visibility = { seen: false };
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) visibility.seen = true;
          else if (visibility.seen) autoSave.current();
        }),
      { threshold: 0.1 }
    );
    if (element.current) observer.observe(element.current);
    return () => observer.disconnect();
  }, []);
  return (
    <article
      ref={element}
      className={`${styles.card} ${reviewed ? styles.reviewed : ''}`}
      aria-label={`Review ${card.data.word ?? card.data.frontText ?? card.data.examples?.[0]?.de ?? card.id}`}
    >
      <header className={styles.header}>
        <h2>
          {card.data.word ?? card.data.frontText ?? card.data.examples?.[0]?.de ?? card.id} <small>{card.type}</small>
        </h2>
        <div className={styles.actions}>
          {reviewed ? (
            <span aria-label="Reviewed">✓</span>
          ) : (
            <Button
              aria-label="Mark as reviewed"
              isDisabled={!eligible || save.isPending}
              onPress={() => save.mutate(true)}
            >
              Mark as reviewed
            </Button>
          )}
          <Button
            aria-label="Save card"
            isDisabled={data === saved || save.isPending}
            onPress={() => save.mutate(false)}
          >
            Save card
          </Button>
          <Button
            aria-label="Delete card"
            tone="error"
            isDisabled={save.isPending || remove.isPending}
            onPress={() => setDeleting(true)}
          >
            Delete card
          </Button>
        </div>
      </header>
      <fieldset disabled={save.isPending || remove.isPending} className={styles.disabled}>
        <ReviewEditor card={card} data={data} onChange={setData} />
      </fieldset>
      {deleting && (
        <ConfirmDialog
          message="Are you sure you want to delete this card?"
          onClose={() => setDeleting(false)}
          onConfirm={() => remove.mutate()}
          pending={remove.isPending}
        />
      )}
    </article>
  );
}

export function BatchAudioButton() {
  const cards = useQuery(apiQuery('/api/cards/missing-audio', z.array(cardSchema)));
  const config = useQuery(apiQuery('/api/environment', environmentSchema));
  const usage = useQuery(apiQuery('/api/model-usage-logs/daily-usage', usageSchema));
  const job = useCreationJob();
  const notifications = useNotifications();
  const [progressOpen, setProgressOpen] = useState(false);
  const needed =
    cards.data && config.data
      ? cards.data.reduce(
          (sum, card) =>
            sum +
            getAudioItems(card, config.data.frontAudioDisabled).filter(
              (item) => !card.data.audio?.some((audio) => audio.text === item.text)
            ).length,
          0
        )
      : undefined;
  const exceedsLimit =
    needed !== undefined &&
    config.data &&
    usage.data &&
    config.data.audioDailyLimit > 0 &&
    usage.data.audioUsageToday + needed > config.data.audioDailyLimit;
  const create = useAction(async () => {
    if (!cards.data) throw new Error('Audio candidates are not available');
    setProgressOpen(true);
    const result = await createAudioInBatch(cards.data);
    if (result.succeeded) {
      notifications.success(
        `Audio generated successfully for ${result.succeeded} card${result.succeeded === 1 ? '' : 's'}!`
      );
      await sendJson('/api/study-sessions/add-cards', 'POST', { cardIds: cards.data.map((card) => card.id) });
    }
    if (result.failed)
      notifications.error(`Failed to generate audio for ${result.failed} card${result.failed === 1 ? '' : 's'}.`);
  });
  return (
    <>
      {(cards.error || config.error || usage.error) && (
        <span role="alert">
          {cards.error?.message ?? config.error?.message ?? usage.error?.message}
          <Button
            onPress={() => {
              void cards.refetch();
              void config.refetch();
              void usage.refetch();
            }}
          >
            Retry
          </Button>
        </span>
      )}
      {!!cards.data?.length && (
        <Button
          aria-label="Generate audio for cards"
          isDisabled={job.isProcessing || create.isPending || !config.data || !usage.data || !!exceedsLimit}
          onPress={() => create.mutate()}
        >
          Generate audio for {cards.data.length} cards
        </Button>
      )}
      {exceedsLimit && (
        <span role="status">
          Daily audio limit reached ({usage.data!.audioUsageToday}/{config.data!.audioDailyLimit} used, {needed} needed)
        </span>
      )}
      {progressOpen && <CreationProgress onClose={() => setProgressOpen(false)} />}
    </>
  );
}
