import {
  defineMiddleware,
  type ReviewCandidateContext,
} from '@open-spaced-repetition/srs-kit'
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

const fuzzFactorSymbol = Symbol('ts-fsrs.fuzzing.factor')

type FuzzingCandidate = ReviewCandidateContext & {
  [fuzzFactorSymbol]?: number
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
        const nextMemoryState = ctx.candidate.step(ctx.input.grade)
        const interval = ctx.candidate.nextInterval(
          nextMemoryState,
          ctx.desiredRetention
        )
        if (interval < 2.5) {
          ctx.scheduledDays = Math.round(interval)
        } else {
          const { minInterval, maxInterval } = getFuzzRange(
            interval,
            ctx.elapsedDays,
            ctx.config.maximumInterval,
            fuzzingRange
          )
          const fuzzFactor = getFuzzFactor({
            candidate: ctx.candidate,
            seed: `${card.cardId}${reps}`,
            rng,
          })
          ctx.scheduledDays = Math.floor(
            fuzzFactor * (maxInterval - minInterval + 1) + minInterval
          )
        }
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

function getFuzzFactor({
  candidate,
  seed,
  rng,
}: {
  readonly candidate: ReviewCandidateContext
  readonly seed: string
  readonly rng: FuzzingRng
}): number {
  const cache = candidate as FuzzingCandidate
  let fuzzFactor = cache[fuzzFactorSymbol]
  if (fuzzFactor === undefined) {
    fuzzFactor = rng(seed)()
    cache[fuzzFactorSymbol] = fuzzFactor
  }
  return fuzzFactor
}
