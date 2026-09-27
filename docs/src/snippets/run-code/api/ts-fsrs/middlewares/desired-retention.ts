import { dateChrono, defineScheduler, Rating } from 'ts-fsrs'
import { schedulerDesiredRetentionMiddleware } from 'ts-fsrs/middlewares'
import { FSRS6_DEFAULT_WEIGHTS, FSRS6Model } from 'ts-fsrs/models/fsrs-6'

const base = {
  weights: FSRS6_DEFAULT_WEIGHTS,
  enableShortTerm: true,
  numRelearningSteps: 1,
}
const now = new Date('2026-01-01T00:00:00.000Z')

// 1) Compose a reusable definition: model, chrono, and the policy.
const schedulerDefinition = defineScheduler({
  model: FSRS6Model,
  chrono: dateChrono,
}).use(schedulerDesiredRetentionMiddleware)

// 2) create() validates a config and returns an independent instance.
function firstDue(retention: number) {
  const scheduler = schedulerDefinition.create({
    config: { ...base, desiredRetention: retention },
  })
  const card = scheduler.newCard({ now })
  const result = scheduler.review({ card, grade: Rating.Good, now })
  return {
    due: result.card.dueAt.toISOString(),
    stability: result.card.stability,
  }
}

console.log(
  JSON.stringify({
    atRetention90: firstDue(0.9),
    atRetention80: firstDue(0.8),
  })
)
