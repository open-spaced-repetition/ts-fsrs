import {
  type DesiredRetentionByGrade,
  defineMiddleware,
  grades,
  parse,
  type ReviewCandidateContext,
} from '@open-spaced-repetition/srs-kit'
import { FSRSMemoryStateSchema } from '@/kit/schema.js'
import { evaluateCostAdrRetention } from './core.js'
import { costAdrConfigSchema } from './schema.js'

const costAdrRetentionsSymbol = Symbol('ts-fsrs.cost-adr.retentions')
type CostAdrCandidate = ReviewCandidateContext & {
  [costAdrRetentionsSymbol]?: {
    retentions: DesiredRetentionByGrade
    lastGrade: number
  }
}

/**
 * Use instead of fixed desired-retention middleware. Interval limits belong to
 * schedulerMaximumIntervalMiddleware.
 */
export const schedulerCostAdrMiddleware = defineMiddleware({
  name: Symbol('ts-fsrs.cost-adr'),
  schema: { config: costAdrConfigSchema },
  handlers: {
    nextInterval(ctx, next) {
      const { costAdrPolicy, goalCostWeight } = ctx.config
      const candidate = ctx.candidate as CostAdrCandidate
      candidate[costAdrRetentionsSymbol] ??= {
        retentions: candidate.desiredRetention,
        lastGrade: 0,
      }
      const cached = candidate[costAdrRetentionsSymbol]
      for (const grade of grades) {
        if (grade > ctx.input.grade) break
        if (grade <= cached.lastGrade) continue
        cached.retentions[grade] = evaluateCostAdrRetention(
          costAdrPolicy,
          parse(FSRSMemoryStateSchema, candidate.step(grade)),
          goalCostWeight
        )
        cached.lastGrade = grade
      }
      next()
    },
  },
})
