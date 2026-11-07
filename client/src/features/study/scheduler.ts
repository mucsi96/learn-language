import { dateChrono, defineScheduler, Rating, State } from 'ts-fsrs';
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
import type { Card } from '../../api/cards';

const definition = defineScheduler({ model: FSRS6Model, chrono: dateChrono }).use(
  schedulerDesiredRetentionMiddleware,
  schedulerFuzzingMiddleware,
  schedulerStatsMiddleware,
  schedulerScheduledDaysMiddleware,
  schedulerLearningStepsMiddleware,
  schedulerMaximumIntervalMiddleware,
  schedulerMonotonicIntervalMiddleware
);
const scheduler = definition.create({
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
const states = { NEW: State.New, LEARNING: State.Learning, REVIEW: State.Review, RELEARNING: State.Relearning };
const storedStates = {
  [State.New]: 'NEW',
  [State.Learning]: 'LEARNING',
  [State.Review]: 'REVIEW',
  [State.Relearning]: 'RELEARNING',
} as const;
const status = {
  [State.New]: 'new',
  [State.Learning]: 'learning',
  [State.Review]: 'review',
  [State.Relearning]: 'learning',
} as const;
const stored = (card: ReturnType<typeof scheduler.newCard>, elapsedDays: number) => ({
  due: card.dueAt,
  stability: card.stability,
  difficulty: card.difficulty,
  elapsedDays,
  scheduledDays: card.scheduledDays,
  learningSteps: card.learningStep,
  reps: card.reps,
  lapses: card.lapses,
  state: storedStates[card.state],
  lastReview: card.lastReviewAt ?? undefined,
});
export const newCardScheduling = (id: string) => stored(scheduler.newCard({ now: new Date(), cardId: id }), 0);
export function gradeCard(card: Card, grade: 'Again' | 'Good') {
  const state = states[card.state];
  const result = scheduler.review({
    now: new Date(),
    grade: Rating[grade],
    card: definition.schema.card.parse({
      cardId: card.id,
      dueAt: card.due,
      lastReviewAt: state === State.New ? null : (card.lastReview ?? null),
      stability: card.stability,
      difficulty: card.difficulty,
      state,
      scheduleStatus: status[state],
      scheduledDays: card.scheduledDays,
      learningStep: card.learningSteps,
      reps: card.reps,
      lapses: card.lapses,
    }),
  });
  return {
    ...stored(
      result.card,
      result.revlog.lastReviewAt === null
        ? 0
        : scheduler.chrono.difference(result.revlog.lastReviewAt, result.revlog.reviewTime)
    ),
    rating: Rating[grade],
  };
}
