import { z } from 'zod/mini'
import { stepsSchema } from '../kit/steps.js'
import { type FSRSParameters, State } from '../models.js'
import { defineSchedulerMiddleware } from '../scheduler/middleware.js'
import { BasicLearningStepsStrategy } from '../strategies/learning_steps.js'

export const learningStepConfigSchema = z.object({
  learningSteps: z._default(stepsSchema, ['1m', '10m']),
  relearningSteps: z._default(stepsSchema, ['10m']),
  daySeconds: z._default(z.number(), 86400),
  enableShortTerm: z._default(z.boolean(), true),
})

export const learningStepFieldSchema = z.object({
  steps: z._default(z.number(), 0),
  state: z._default(z.number(), State.New),
})

export const learningStepMiddleware = defineSchedulerMiddleware({
  configSchema: learningStepConfigSchema,
  fieldSchema: learningStepFieldSchema,
  fieldDefaults: {
    steps: 0,
    state: State.New,
  },
  review(ctx, next) {
    const result = next()
    if (!ctx.config.enableShortTerm) {
      return result
    }
    const state = ctx.input.card.state
    const params: Pick<FSRSParameters, 'learning_steps' | 'relearning_steps'> =
      {
        learning_steps: ctx.config.learningSteps,
        relearning_steps: ctx.config.relearningSteps,
      }
    const schedule = BasicLearningStepsStrategy(
      params,
      state,
      ctx.input.card.steps
    )[ctx.input.rating]

    if (!schedule) {
      result.card.steps = 0
      return result
    }

    const scheduledMinutes = schedule.scheduled_minutes
    result.card.steps = schedule.next_step
    result.card.interval = (scheduledMinutes * 60) / ctx.config.daySeconds

    // A step that spans a full day or more graduates the card to Review (legacy
    // `applyLearningSteps`); shorter steps stay in (Re)learning.
    result.card.state =
      scheduledMinutes >= ctx.config.daySeconds / 60
        ? State.Review
        : state === State.Review || state === State.Relearning
          ? State.Relearning
          : State.Learning

    return result
  },
  rollback(_ctx, next) {
    return next()
  },
})
