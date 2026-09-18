import {
  defineMiddleware,
  type Grade,
  type NextIntervalMiddlewareContext,
  type ReviewCandidateContext,
  State,
} from '@open-spaced-repetition/srs-kit'
import type { Mutable } from '@open-spaced-repetition/srs-kit/schema'
import { calculateLearningSteps } from './core.js'
import {
  learningStepFieldsSchema,
  learningStepsConfigSchema,
} from './schema.js'
import type { LearningStepSchedule, LearningStepsResult } from './types.js'

const MINUTES_PER_DAY = 1440
const SECONDS_PER_MINUTE = 60
const resolvedStepsSymbol = Symbol('ts-fsrs.learning-steps.resolved')

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
    nextInterval: scheduleLearningSteps,
    review(ctx, next) {
      const resolved = ctx.config.enableShortTerm
        ? resolveLearningSteps(ctx)
        : undefined
      next()
      const card = ctx.input.card
      const step = resolved?.steps[ctx.input.grade]
      const scheduledMinutes =
        resolved && step
          ? getScheduledMinutes(resolved, ctx.input.grade, step)
          : undefined

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

function scheduleLearningSteps(
  ctx: NextIntervalMiddlewareContext<{
    config: typeof learningStepsConfigSchema
    card: typeof learningStepFieldsSchema
  }>,
  next: () => void
): ResolvedLearningSteps | undefined {
  if (!ctx.config.enableShortTerm) {
    next()
    return
  }
  const resolved = resolveLearningSteps(ctx)
  const step = resolved.steps[ctx.input.grade]
  const scheduledMinutes = step
    ? getScheduledMinutes(resolved, ctx.input.grade, step)
    : undefined
  next()

  // Restore the exact learning step after downstream day-level middleware.
  if (scheduledMinutes !== undefined && scheduledMinutes > 0) {
    ctx.scheduledDays = scheduledMinutes / MINUTES_PER_DAY
  }

  return resolved
}

function resolveLearningSteps(
  ctx: NextIntervalMiddlewareContext<{
    config: typeof learningStepsConfigSchema
    card: typeof learningStepFieldsSchema
  }>
): ResolvedLearningSteps {
  const card = ctx.input.card
  const candidate = ctx.candidate as Mutable<LearningStepsCandidate>
  let resolved = candidate[resolvedStepsSymbol]
  if (!resolved) {
    resolved = {
      steps: calculateLearningSteps(ctx.config, card.state, card.learningStep),
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
  return resolved
}

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

  const rawMinutes = Math.max(0, step.scheduledMinutes)
  const scheduledMinutes =
    Math.round(rawMinutes * SECONDS_PER_MINUTE) / SECONDS_PER_MINUTE
  resolved.scheduledMinutes[grade] = scheduledMinutes
  return scheduledMinutes
}
