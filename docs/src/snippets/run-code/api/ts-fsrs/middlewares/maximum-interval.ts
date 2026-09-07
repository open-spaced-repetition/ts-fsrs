import { dateChrono, defineScheduler, Rating } from 'ts-fsrs'
import {
  schedulerDesiredRetentionMiddleware,
  schedulerMaximumIntervalMiddleware,
} from 'ts-fsrs/middlewares'
import { FSRS6_DEFAULT_WEIGHTS, FSRS6Model } from 'ts-fsrs/models/fsrs-6'

// 1) Reusable definition.
const schedulerDefinition = defineScheduler({
  model: FSRS6Model,
  chrono: dateChrono,
}).use(schedulerDesiredRetentionMiddleware, schedulerMaximumIntervalMiddleware)

// 2) create() validates the config and returns an instance.
const scheduler = schedulerDefinition.create({
  config: {
    weights: FSRS6_DEFAULT_WEIGHTS,
    enableShortTerm: true,
    numRelearningSteps: 1,
    desiredRetention: 0.9,
    maximumInterval: 1,
  },
})

const now = new Date('2026-01-01T00:00:00.000Z')
const card = scheduler.newCard({ now })
const result = scheduler.review({ card, grade: Rating.Good, now })

console.log(
  JSON.stringify({
    state: result.card.state,
    due: result.card.dueAt.toISOString(),
    stability: result.card.stability,
  })
)
