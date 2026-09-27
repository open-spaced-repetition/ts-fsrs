import { dateChrono, defineScheduler, Rating } from 'ts-fsrs'
import {
  schedulerDesiredRetentionMiddleware,
  schedulerStatsMiddleware,
} from 'ts-fsrs/middlewares'
import { FSRS6_DEFAULT_WEIGHTS, FSRS6Model } from 'ts-fsrs/models/fsrs-6'

// 1) Reusable definition.
const schedulerDefinition = defineScheduler({
  model: FSRS6Model,
  chrono: dateChrono,
}).use(schedulerDesiredRetentionMiddleware, schedulerStatsMiddleware)

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
const first = scheduler.newCard({ now })
const good = scheduler.review({ card: first, grade: Rating.Good, now })
const again = scheduler.review({
  card: good.card,
  grade: Rating.Again,
  now: good.card.dueAt,
})

console.log(
  JSON.stringify({
    reps: again.card.reps,
    lapses: again.card.lapses,
    state: again.card.state,
  })
)
