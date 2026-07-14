import {
  defineMiddleware,
  type ReviewCandidateContext,
} from '@open-spaced-repetition/srs-kit'
import type { Mutable } from '@open-spaced-repetition/srs-kit/schema'
import { createCardId } from './card-id.js'
import {
  FUZZ_RANGES,
  type FuzzingRng,
  type FuzzRange,
  fnv1aMulberry32Rng,
  getFuzzRange,
} from './core.js'
import {
  fuzzingCardFieldsSchema,
  fuzzingCardInitInputSchema,
  fuzzingConfigSchema,
  fuzzingRevlogFieldsSchema,
} from './schema.js'

const fuzzingDecoratorSymbol = Symbol('ts-fsrs.fuzzing.decorator')

type FuzzingCandidate = ReviewCandidateContext & {
  [fuzzingDecoratorSymbol]?: true
}

export type SchedulerFuzzingMiddlewareOptions = {
  readonly fuzzingRange?: readonly FuzzRange[]
  readonly rng?: FuzzingRng
}

export function createSchedulerFuzzingMiddleware(
  options: SchedulerFuzzingMiddlewareOptions = {}
) {
  const { fuzzingRange = FUZZ_RANGES, rng = fnv1aMulberry32Rng } = options

  return defineMiddleware({
    name: Symbol('ts-fsrs.fuzzing'),
    schema: {
      config: fuzzingConfigSchema,
      cardInitInput: fuzzingCardInitInputSchema,
      card: fuzzingCardFieldsSchema,
      revlog: fuzzingRevlogFieldsSchema,
    },
    defaultValue: {
      card(ctx) {
        if (ctx.operation === 'forget') {
          return {
            cardId: ctx.input.cardId,
            reps: ctx.config.clearStatsOnForget === false ? ctx.input.reps : 0,
          }
        }
        return {
          cardId: ctx.input.cardId ?? createCardId(),
          reps: 0,
        }
      },
    },
    handlers: {
      review(ctx, next) {
        const card = ctx.input.card
        if (!ctx.config.enableFuzz) {
          next()
          ctx.result.card.cardId = card.cardId
          ctx.result.card.reps ??= card.reps + 1
          ctx.result.revlog.cardId = card.cardId
          return
        }

        const reps = ctx.result.card.reps ?? card.reps + 1
        const candidate = ctx.candidate as Mutable<FuzzingCandidate>
        if (!candidate[fuzzingDecoratorSymbol]) {
          const nextInterval = candidate.nextInterval
          const seed = `${card.cardId}${reps}`
          candidate.nextInterval = (memoryState, desiredRetention) => {
            const interval = nextInterval(memoryState, desiredRetention)
            if (interval < 2.5) return Math.round(interval)

            const { minInterval, maxInterval } = getFuzzRange(
              interval,
              ctx.elapsedDays,
              ctx.config.maximumInterval,
              fuzzingRange
            )
            const fuzzFactor = rng(seed)()
            return Math.floor(
              fuzzFactor * (maxInterval - minInterval + 1) + minInterval
            )
          }
          candidate[fuzzingDecoratorSymbol] = true
        }

        // Leave this unset so finalizeReview resolves the decorated interval
        // after downstream middleware has had a chance to override it.
        ctx.scheduledDays = undefined
        next()
        ctx.result.card.cardId = card.cardId
        ctx.result.card.reps ??= reps
        ctx.result.revlog.cardId = card.cardId
      },

      rollback(ctx, next) {
        next()
        ctx.result.card.cardId = ctx.input.revlog.cardId
        ctx.result.card.reps ??= Math.max(0, ctx.input.card.reps - 1)
      },
    },
  })
}

export const schedulerFuzzingMiddleware = createSchedulerFuzzingMiddleware()
