import { defineMiddleware, State } from '@open-spaced-repetition/srs-kit'
import { calculateLearningSteps } from './core.js'
import {
  learningStepFieldsSchema,
  learningStepsConfigSchema,
} from './schema.js'
import type { LearningStepsResult } from './types.js'

const MINUTES_PER_DAY = 1440
const resolvedSteps = new WeakMap<object, LearningStepsResult>()

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

      let steps = resolvedSteps.get(card)
      if (!steps) {
        steps = calculateLearningSteps(
          ctx.config,
          card.state,
          card.learningStep
        )
        resolvedSteps.set(card, steps)
      }
      const step = steps[ctx.input.grade]
      const scheduledMinutes = step
        ? Math.max(0, step.scheduledMinutes)
        : undefined

      if (scheduledMinutes !== undefined && scheduledMinutes > 0) {
        ctx.scheduledDays = Math.round(scheduledMinutes) / MINUTES_PER_DAY
      }

      next()

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
