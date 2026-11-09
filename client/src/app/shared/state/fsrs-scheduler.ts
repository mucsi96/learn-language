import { dateChrono, defineScheduler, State } from 'ts-fsrs';
import {
  schedulerDesiredRetentionMiddleware,
  schedulerFuzzingMiddleware,
  schedulerStatsMiddleware,
  schedulerScheduledDaysMiddleware,
  schedulerLearningStepsMiddleware,
  schedulerMaximumIntervalMiddleware,
  schedulerMonotonicIntervalMiddleware,
} from 'ts-fsrs/middlewares';
import { FSRS6Model, migrateFSRS6Parameters } from 'ts-fsrs/models/fsrs-6';
import { Card } from '../../parser/types';
import { mapCardStateToTsfsrsState, mapTsfsrsStateToCardState } from './card-state';

const definition = defineScheduler({ model: FSRS6Model, chrono: dateChrono }).use(
  schedulerDesiredRetentionMiddleware,
  schedulerFuzzingMiddleware,
  schedulerStatsMiddleware,
  schedulerScheduledDaysMiddleware,
  schedulerLearningStepsMiddleware,
  schedulerMaximumIntervalMiddleware,
  schedulerMonotonicIntervalMiddleware
);

export const scheduler = definition.create({
  config: {
    weights: migrateFSRS6Parameters(),
    fractionalDays: false,
    enableShortTerm: true,
    numRelearningSteps: 1,
    desiredRetention: 0.9,
    learningSteps: ['1m', '10m'],
    relearningSteps: ['10m'],
    enableFuzz: false,
    maximumInterval: 36500,
    clearStatsOnForget: false,
  },
});

export function toSchedulerCard(card: Card) {
  const state = mapCardStateToTsfsrsState(card.state);
  const scheduleStatus = {
    [State.New]: 'new',
    [State.Learning]: 'learning',
    [State.Review]: 'review',
    [State.Relearning]: 'learning',
  } as const;

  return definition.schema.card.parse({
    cardId: card.id,
    dueAt: card.due,
    lastReviewAt: state === State.New ? null : card.lastReview ?? null,
    stability: card.stability,
    difficulty: card.difficulty,
    state,
    scheduleStatus: scheduleStatus[state],
    scheduledDays: card.scheduledDays,
    learningStep: card.learningSteps,
    reps: card.reps,
    lapses: card.lapses,
  });
}

export function toCardUpdate(result: ReturnType<typeof scheduler.review>) {
  const { card, revlog } = result;
  return toStoredScheduling(card, revlog.lastReviewAt === null
    ? 0
    : scheduler.chrono.difference(revlog.lastReviewAt, revlog.reviewTime));
}

export function newCardScheduling(cardId: string) {
  return toStoredScheduling(scheduler.newCard({ now: new Date(), cardId }), 0);
}

function toStoredScheduling(card: ReturnType<typeof scheduler.newCard>, elapsedDays: number) {
  return {
    due: card.dueAt,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays,
    scheduledDays: card.scheduledDays,
    learningSteps: card.learningStep,
    reps: card.reps,
    lapses: card.lapses,
    state: mapTsfsrsStateToCardState(card.state),
    lastReview: card.lastReviewAt ?? undefined,
  };
}
