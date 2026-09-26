import { dateChrono, defineScheduler, Rating } from 'ts-fsrs'
import {
  COST_ADR_DEFAULT_GOAL_COST_WEIGHT,
  COST_ADR_DEFAULT_POLICY,
  schedulerCostAdrMiddleware,
} from 'ts-fsrs/middlewares'
import { FSRS7_DEFAULT_WEIGHTS, FSRS7Model } from 'ts-fsrs/models/fsrs-7'

const schedulerDefinition = defineScheduler({
  model: FSRS7Model,
  chrono: dateChrono,
}).use(schedulerCostAdrMiddleware)

const scheduler = schedulerDefinition.create({
  config: {
    weights: FSRS7_DEFAULT_WEIGHTS,
    fractionalDays: true,
    costAdrPolicy: COST_ADR_DEFAULT_POLICY,
    goalCostWeight: COST_ADR_DEFAULT_GOAL_COST_WEIGHT,
  },
})

const now = new Date('2026-01-01T00:00:00.000Z')
const card = scheduler.newCard({ now })
const result = scheduler.review({ card, grade: Rating.Good, now })

console.log(
  JSON.stringify({
    due: result.card.dueAt.toISOString(),
    stability: result.card.stability,
    stabilityFast: result.card.stabilityFast,
  })
)
