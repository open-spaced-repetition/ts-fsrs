import { z } from 'zod/mini'
import { type FSRSParameters, State } from '../models.js'
import { defineSchedulerMiddleware } from '../scheduler/middleware.js'
import { BasicLearningStepsStrategy } from '../strategies/learning_steps.js'

const stepUnitSchema = z.string().check(z.regex(/^\d+(m|h|d)$/))

export const learningStepConfigSchema = z.object({
  learningSteps: z._default(z.array(stepUnitSchema), ['1m', '10m']),
  relearningSteps: z._default(z.array(stepUnitSchema), ['10m']),
  daySeconds: z._default(z.number(), 86400),
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
    const state = ctx.input.card.state
    const params = {
      learning_steps: ctx.config.learningSteps,
      relearning_steps: ctx.config.relearningSteps,
    } as Pick<FSRSParameters, 'learning_steps' | 'relearning_steps'>
    const schedule = BasicLearningStepsStrategy(
      params,
      state,
      ctx.input.card.steps
    )[ctx.input.rating]

    if (!schedule) {
      result.card.steps = 0
      return result
    }

    result.card.steps = schedule.next_step
    result.card.interval =
      (schedule.scheduled_minutes * 60) / ctx.config.daySeconds

    result.card.state =
      state === State.Review || state === State.Relearning
        ? State.Relearning
        : State.Learning

    return result
  },
  rollback(_ctx, next) {
    return next()
  },
})
