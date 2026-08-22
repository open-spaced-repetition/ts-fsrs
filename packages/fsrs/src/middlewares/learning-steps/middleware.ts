import {
  defineMiddleware,
  type Grade,
  type ReviewCandidateContext,
  State,
} from '@open-spaced-repetition/srs-kit'
import type { Mutable } from '@open-spaced-repetition/srs-kit/schema'
import { calculateLearningSteps } from './core.js'
import {
  learningStepFieldsSchema,
  learningStepsConfigSchema,
} from './schema.js'
import type {
  LearningStepSchedule,
  LearningStepsConfig,
  LearningStepsResult,
} from './types.js'

const MINUTES_PER_DAY = 1440
const resolvedStepsSymbol = Symbol('ts-fsrs.learning-steps.resolved')

// Deterministic per-config step schedules are memoized by config identity:
// the parsed config object is stable for the lifetime of a scheduler, so
// repeated reviews of the same (state, learningStep) reuse the computed
// schedule instead of rebuilding it (and its allocations) every review.
const learningStepsCache = new WeakMap<
  object,
  Map<State, Map<number, LearningStepsResult>>
>()

function resolveLearningSteps(
  config: LearningStepsConfig,
  state: State,
  learningStep: number
): LearningStepsResult {
  // The cache is keyed by config identity, so only memoize when the step
  // schedules are immutable: in-place mutations of the arrays would otherwise
  // be masked by stale cached results.
  if (
    !Object.isFrozen(config.learningSteps) ||
    !Object.isFrozen(config.relearningSteps)
  ) {
    return calculateLearningSteps(config, state, learningStep)
  }
  let byState = learningStepsCache.get(config)
  if (!byState) {
    byState = new Map()
    learningStepsCache.set(config, byState)
  }
  let byStep = byState.get(state)
  if (!byStep) {
    byStep = new Map()
    byState.set(state, byStep)
  }
  let result = byStep.get(learningStep)
  if (!result) {
    result = calculateLearningSteps(config, state, learningStep)
    byStep.set(learningStep, result)
  }
  return result
}

type ResolvedLearningSteps = {
  readonly steps: LearningStepsResult
  readonly scheduledMinutes: Partial<Record<Grade, number>>
}

type LearningStepsCandidate = ReviewCandidateContext & {
  [resolvedStepsSymbol]?: ResolvedLearningSteps
}

export const schedulerLearningStepsMiddleware = defineMiddleware({
  name: Symbol('ts-fsrs.learning-steps'),
  schema: {
    config: learningStepsConfigSchema,
    card: learningStepFieldsSchema,
    revlog: learningStepFieldsSchema,
  },
  defaultValue: {
    card() {
      return { learningStep: 0 }
    },
  },
  handlers: {
    review(ctx, next) {
      const card = ctx.input.card
      if (!ctx.config.enableShortTerm) {
        next()
        ctx.result.revlog.learningStep = card.learningStep
        ctx.result.card.learningStep = 0
        return
      }

      const candidate = ctx.candidate as Mutable<LearningStepsCandidate>
      let resolved = candidate[resolvedStepsSymbol]
      if (!resolved) {
        resolved = {
          steps: resolveLearningSteps(
            ctx.config,
            card.state,
            card.learningStep
          ),
          scheduledMinutes: {},
        }
        candidate[resolvedStepsSymbol] = resolved
        const resolvedSteps = resolved
        const nextInterval = candidate.nextInterval
        candidate.nextInterval = (memoryState, desiredRetention) => {
          const grade = candidate.findGrade(memoryState)
          if (grade === undefined) {
            return nextInterval(memoryState, desiredRetention)
          }

          const step = resolvedSteps.steps[grade]
          const scheduledMinutes = step
            ? getScheduledMinutes(resolvedSteps, grade, step)
            : undefined
          if (scheduledMinutes !== undefined && scheduledMinutes > 0) {
            return scheduledMinutes / MINUTES_PER_DAY
          }
          return nextInterval(memoryState, desiredRetention)
        }
      }
      const step = resolved.steps[ctx.input.grade]
      const scheduledMinutes = step
        ? getScheduledMinutes(resolved, ctx.input.grade, step)
        : undefined
      next()

      // Restore the exact learning step after downstream day-level middleware.
      if (scheduledMinutes !== undefined && scheduledMinutes > 0) {
        ctx.scheduledDays = scheduledMinutes / MINUTES_PER_DAY
      }

      ctx.result.revlog.learningStep = card.learningStep
      ctx.result.card.learningStep = 0

      if (step && scheduledMinutes !== undefined) {
        if (scheduledMinutes > 0 && scheduledMinutes < MINUTES_PER_DAY) {
          ctx.result.card.learningStep = Math.max(0, step.nextStep)
          ctx.result.card.state = nextLearningState(card.state)
          ctx.result.card.scheduleStatus = 'learning'
        } else if (scheduledMinutes >= MINUTES_PER_DAY) {
          ctx.result.card.learningStep = Math.max(0, step.nextStep)
          ctx.result.card.state = State.Review
          ctx.result.card.scheduleStatus = 'review'
        }
      }
    },

    rollback(ctx, next) {
      next()
      ctx.result.card.learningStep = ctx.input.revlog.learningStep
    },
  },
})

function nextLearningState(state: State): State {
  if (state === State.New) return State.Learning
  if (state === State.Review) return State.Relearning
  return state
}

function getScheduledMinutes(
  resolved: ResolvedLearningSteps,
  grade: Grade,
  step: LearningStepSchedule
): number {
  const cached = resolved.scheduledMinutes[grade]
  if (cached !== undefined) return cached

  const scheduledMinutes = Math.round(Math.max(0, step.scheduledMinutes))
  resolved.scheduledMinutes[grade] = scheduledMinutes
  return scheduledMinutes
}
