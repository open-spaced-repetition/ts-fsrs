import { dateChrono, defineScheduler, Rating } from 'ts-fsrs'
import { schedulerDesiredRetentionMiddleware } from 'ts-fsrs/middlewares'
import { FSRS6_DEFAULT_WEIGHTS, FSRS6Model } from 'ts-fsrs/models/fsrs-6'

// 1) Reusable definition.
const schedulerDefinition = defineScheduler({
  model: FSRS6Model,
  chrono: dateChrono,
}).use(schedulerDesiredRetentionMiddleware)

// 2) create() validates the config and returns an instance.
const scheduler = schedulerDefinition.create({
  config: {
    weights: FSRS6_DEFAULT_WEIGHTS,
    enableShortTerm: true,
    numRelearningSteps: 1,
    desiredRetention: 0.9,
  },
})

const now = new Date('2026-01-01T00:00:00.000Z')
const card = scheduler.newCard({ now })
const review = scheduler.review({ card, grade: Rating.Good, now })
const previewCount = Array.from(
  scheduler.preview({ card: review.card, now: review.card.dueAt })
).length
const rolledBack = scheduler.rollback({
  card: review.card,
  revlog: review.revlog,
})

console.log(
  JSON.stringify({
    newState: card.state,
    reviewedState: review.card.state,
    previewCount,
    rolledBackDue: rolledBack.dueAt.toISOString(),
  })
)
