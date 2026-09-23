import { dateChrono, defineScheduler, Rating, State } from 'ts-fsrs'
import {
  schedulerDesiredRetentionMiddleware,
  schedulerFuzzingMiddleware,
  schedulerLearningStepsMiddleware,
  schedulerMaximumIntervalMiddleware,
  schedulerMonotonicIntervalMiddleware,
  schedulerScheduledDaysMiddleware,
  schedulerStatsMiddleware,
} from 'ts-fsrs/middlewares'
import { FSRS7_DEFAULT_WEIGHTS, FSRS7Model } from 'ts-fsrs/models/fsrs-7'
import { Reschedule } from 'ts-fsrs/reschedule'

export const definition = defineScheduler({
  model: FSRS7Model,
  chrono: dateChrono,
}).use(
  schedulerDesiredRetentionMiddleware,
  schedulerFuzzingMiddleware,
  schedulerStatsMiddleware,
  schedulerScheduledDaysMiddleware,
  schedulerLearningStepsMiddleware,
  schedulerMaximumIntervalMiddleware,
  schedulerMonotonicIntervalMiddleware
)

export const scheduler = definition.create({
  config: {
    weights: FSRS7_DEFAULT_WEIGHTS,
    fractionalDays: true,
    enableShortTerm: true, // Controls learning steps, not the model's fast trace.
    desiredRetention: 0.9,
    // Preserve existing steps explicitly instead of inheriting preset defaults.
    learningSteps: ['1m', '10m'],
    relearningSteps: ['10m'],
    enableFuzz: false,
    maximumInterval: 36500,
    clearStatsOnForget: false,
  },
})

type Card = ReturnType<typeof scheduler.newCard>
type PreviousCard = Omit<Card, 'stabilityFast'>
type StoredReview = { rating: Rating; review: string }

// completeHistory means all reviews since creation or the latest memory reset.
// Decide this from application records, not from the number of rows alone.
export function migrateMemory(
  card: PreviousCard,
  logs: readonly StoredReview[],
  completeHistory: boolean
): Card {
  if (card.state === State.New) {
    const { stability, stabilityFast, difficulty } = scheduler.newCard({
      cardId: card.cardId,
    })
    return definition.schema.card.parse({
      ...card,
      stability,
      stabilityFast,
      difficulty,
    })
  }
  if (!completeHistory)
    throw new Error('Keep this card on FSRS-6: incomplete history')

  const history = logs
    .filter(({ rating }) => rating !== Rating.Manual)
    .map(({ rating, review }) => ({
      rating,
      reviewTime: new Date(review),
    }))
  // replay validates dates/ratings and sorts the non-manual history.
  // Empty or Manual-only histories throw instead of clearing memory.
  const { memoryState } = new Reschedule(scheduler).replay({ history })
  const latestReview = history.reduce(
    (latest, { reviewTime }) => Math.max(latest, reviewTime.getTime()),
    -Infinity
  )
  if (card.lastReviewAt?.getTime() !== latestReview) {
    throw new Error(
      'Keep this card on FSRS-6: history does not match lastReviewAt'
    )
  }
  // Only the model memory changes; dueAt, counters and learning progress survive.
  return definition.schema.card.parse({ ...card, ...memoryState })
}

export const previousCard: PreviousCard = {
  cardId: 'card-1',
  dueAt: new Date('2026-01-05T00:00:00.000Z'),
  lastReviewAt: new Date('2026-01-02T00:00:00.000Z'),
  stability: 2,
  difficulty: 5,
  state: State.Review,
  scheduleStatus: 'review',
  scheduledDays: 3,
  learningStep: 0,
  reps: 3,
  lapses: 0,
}
export const storedHistory: StoredReview[] = [
  { rating: Rating.Good, review: '2026-01-01T00:00:00.000Z' },
  { rating: Rating.Good, review: '2026-01-01T00:10:00.000Z' },
  { rating: Rating.Good, review: '2026-01-02T00:00:00.000Z' },
]
const migrated = migrateMemory(previousCard, storedHistory, true)

console.log(
  JSON.stringify(
    {
      model: 'FSRS-7',
      cardId: migrated.cardId,
      dueAt: migrated.dueAt,
      reps: migrated.reps,
      stabilityFast: migrated.stabilityFast,
    },
    null,
    2
  )
)
