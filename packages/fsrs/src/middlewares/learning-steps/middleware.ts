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
import type { LearningStepSchedule, LearningStepsResult } from './types.js'

const MINUTES_PER_DAY = 1440
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
          steps: calculateLearningSteps(
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
