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
import { FSRS6Model, migrateFSRS6Parameters } from 'ts-fsrs/models/fsrs-6'

// Keep the definition at application scope; create an instance per config.
export const definition = defineScheduler({
  model: FSRS6Model,
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
    weights: migrateFSRS6Parameters(), // Pass the user's existing FSRS-6 weights here.
    fractionalDays: false,
    enableShortTerm: true,
    numRelearningSteps: 1, // Keep equal to relearningSteps.length.
    desiredRetention: 0.9,
    learningSteps: ['1m', '10m'],
    relearningSteps: ['10m'],
    enableFuzz: false,
    maximumInterval: 36500,
    clearStatsOnForget: false, // Match v5 forget's default counter behavior.
  },
})

export type Card = ReturnType<typeof scheduler.newCard>
export type Revlog = ReturnType<typeof scheduler.review>['revlog']

// An application's stored v5 record, not a legacy library type.
type StoredV5Card = {
  due: string
  last_review?: string | null
  stability: number
  difficulty: number
  state: State
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
}

export function convertCard(
  stored: StoredV5Card,
  cardId: Card['cardId']
): Card {
  const scheduleStatus = {
    [State.New]: 'new',
    [State.Learning]: 'learning',
    [State.Review]: 'review',
    [State.Relearning]: 'learning',
  } as const

  return definition.schema.card.parse({
    cardId,
    dueAt: new Date(stored.due),
    lastReviewAt:
      stored.state === State.New || stored.last_review == null
        ? null
        : new Date(stored.last_review),
    stability: stored.stability,
    difficulty: stored.difficulty,
    state: stored.state,
    scheduleStatus: scheduleStatus[stored.state],
    scheduledDays: stored.scheduled_days,
    learningStep: stored.learning_steps,
    reps: stored.reps,
    lapses: stored.lapses,
  })
}

export const storedCard = {
  due: '2026-01-03T00:00:00.000Z',
  last_review: '2026-01-01T00:00:00.000Z',
  stability: 2,
  difficulty: 5,
  state: State.Review,
  scheduled_days: 2,
  learning_steps: 0,
  reps: 3,
  lapses: 0,
} satisfies StoredV5Card

const card = convertCard(storedCard, 'card-1')
// An overdue review: previous review, original due date and now are distinct.
const now = new Date('2026-01-04T00:00:00.000Z')
const result = scheduler.review({ card, grade: Rating.Good, now })
const restored = scheduler.rollback({
  card: result.card,
  revlog: result.revlog,
})

console.log(
  JSON.stringify(
    {
      cardId: result.card.cardId,
      rating: result.revlog.rating,
      reps: result.card.reps,
      revlog: {
        lastReviewAt: result.revlog.lastReviewAt,
        dueAt: result.revlog.dueAt,
        reviewTime: result.revlog.reviewTime,
      },
      rollbackDueAt: restored.dueAt,
    },
    null,
    2
  )
)
