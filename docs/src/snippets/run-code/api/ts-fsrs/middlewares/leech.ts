import { dateChrono, defineScheduler, Rating } from 'ts-fsrs'
import {
  schedulerDesiredRetentionMiddleware,
  schedulerLeechMiddleware,
  schedulerStatsMiddleware,
} from 'ts-fsrs/middlewares'
import { FSRS6_DEFAULT_WEIGHTS, FSRS6Model } from 'ts-fsrs/models/fsrs-6'

// 1) Reusable definition.
const schedulerDefinition = defineScheduler({
  model: FSRS6Model,
  chrono: dateChrono,
}).use(
  schedulerDesiredRetentionMiddleware,
  schedulerStatsMiddleware,
  schedulerLeechMiddleware
)

// 2) create() validates the config and returns an instance.
const scheduler = schedulerDefinition.create({
  config: {
    weights: FSRS6_DEFAULT_WEIGHTS,
    enableShortTerm: true,
    numRelearningSteps: 1,
    desiredRetention: 0.9,
    leechThreshold: 1,
  },
})

const now = new Date('2026-01-01T00:00:00.000Z')
const newCard = scheduler.newCard({ now })
const good = scheduler.review({ card: newCard, grade: Rating.Good, now }).card
const lapse1 = scheduler.review({
  card: good,
  grade: Rating.Again,
  now: good.dueAt,
}).card
const lapse2 = scheduler.review({
  card: lapse1,
  grade: Rating.Again,
  now: lapse1.dueAt,
}).card

console.log(
  JSON.stringify({
    scheduleStatus: lapse2.scheduleStatus,
    lapses: lapse2.lapses,
  })
)
