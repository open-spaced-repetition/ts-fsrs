import {
  defineMiddleware,
  type Grade,
  grades,
  type NextIntervalMiddlewareContext,
  Rating,
  type ReviewCandidateContext,
  State,
} from '@open-spaced-repetition/srs-kit'
import type { Mutable } from '@open-spaced-repetition/srs-kit/schema'
import { calculateLearningSteps } from './core.js'
import {
  learningStepFieldsSchema,
  learningStepsConfigSchema,
} from './schema.js'
import type { LearningStepsResult } from './types.js'

const MINUTES_PER_DAY = 1440
const SECONDS_PER_MINUTE = 60
const resolvedStepsSymbol = Symbol('ts-fsrs.learning-steps.resolved')

type LearningStepsContext = NextIntervalMiddlewareContext<{
  config: typeof learningStepsConfigSchema
  card: typeof learningStepFieldsSchema
}>

type ResolvedLearningSteps = {
  readonly steps: LearningStepsResult
  /** Whether the current (re)learning step list is non-empty. */
  readonly hasSteps: boolean
  /** Second-rounded step intervals in days, only for steps longer than zero. */
  readonly stepIntervals: Partial<Record<Grade, number>>
  /** Grades whose last resolved interval replaced their step with the model. */
  readonly overridesStep: Partial<Record<Grade, boolean>>
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
      const { card, grade } = ctx.input
      const { graduatingInterval } = ctx.config
      const scheduledDays = ctx.scheduledDays
      const step =
        resolved?.stepIntervals[grade] !== undefined
          ? resolved.steps[grade]
          : undefined

      ctx.result.revlog.learningStep = card.learningStep
      ctx.result.card.learningStep = 0

      // Intervals below graduation stay in (re)learning, and an Again capped by
      // the model override always (re)learns. Only (re)learning cards keep a
      // step.
      if (
        (grade === Rating.Again && resolved?.overridesStep[grade] === true) ||
        (scheduledDays !== undefined && scheduledDays < graduatingInterval)
      ) {
        ctx.result.card.state = nextLearningState(card.state)
        ctx.result.card.scheduleStatus = 'learning'
        if (step) ctx.result.card.learningStep = Math.max(0, step.nextStep)
      }
    },

    rollback(ctx, next) {
      next()
      ctx.result.card.learningStep = ctx.input.revlog.learningStep
    },
  },
})

function scheduleLearningSteps(
  ctx: LearningStepsContext,
  next: () => void
): ResolvedLearningSteps | undefined {
  if (!ctx.config.enableShortTerm) {
    next()
    return
  }
  const resolved = resolveLearningSteps(ctx)
  next()

  // Restore the exact learning step after downstream day-level middleware,
  // but let downstream policies shape a model interval that overrides it.
  const { grade } = ctx.input
  const stepInterval = resolved.stepIntervals[grade]
  if (stepInterval !== undefined && !resolved.overridesStep[grade]) {
    ctx.scheduledDays = stepInterval
  }
  return resolved
}

function resolveLearningSteps(
  ctx: LearningStepsContext
): ResolvedLearningSteps {
  const candidate = ctx.candidate as Mutable<LearningStepsCandidate>
  const cached = candidate[resolvedStepsSymbol]
  if (cached) return cached

  const { card } = ctx.input
  const { config } = ctx
  const stepList =
    card.state === State.Relearning || card.state === State.Review
      ? config.relearningSteps
      : config.learningSteps
  const steps = calculateLearningSteps(config, card.state, card.learningStep)
  const stepIntervals: Partial<Record<Grade, number>> = {}
  for (const grade of grades) {
    const step = steps[grade]
    if (!step) continue
    const minutes =
      Math.round(Math.max(0, step.scheduledMinutes) * SECONDS_PER_MINUTE) /
      SECONDS_PER_MINUTE
    if (minutes > 0) stepIntervals[grade] = minutes / MINUTES_PER_DAY
  }
  const resolved: ResolvedLearningSteps = {
    steps,
    hasSteps: stepList.length > 0,
    stepIntervals,
    overridesStep: {},
  }
  candidate[resolvedStepsSymbol] = resolved

  const nextInterval = candidate.nextInterval
  candidate.nextInterval = (memoryState, desiredRetention) => {
    const grade = candidate.findGrade(memoryState)
    if (grade === undefined) return nextInterval(memoryState, desiredRetention)
    const interval = getLearningStepInterval(resolved, grade, config, () =>
      nextInterval(memoryState, desiredRetention)
    )
    const stepInterval = resolved.stepIntervals[grade]
    resolved.overridesStep[grade] =
      stepInterval !== undefined && interval !== stepInterval
    return interval
  }
  return resolved
}

/**
 * Applies steps and graduation to a grade's interval. The model interval is
 * only evaluated when a policy needs it.
 *
 * Examples with steps `['1m', '10m']` / `['10m']` and `graduatingInterval: 1`:
 *
 * | Card                | Grade | Override | Step  | Model | Interval       |
 * | ------------------- | ----- | -------- | ----- | ----- | -------------- |
 * | New                 | Good  | off      | 10m   | -     | 10m            |
 * | New                 | Again | on       | 1m    | 3s    | 1m             |
 * | New                 | Hard  | on       | 5.5m  | 14h   | 14h            |
 * | Review              | Again | on       | 10m   | 13d   | 1d (capped)    |
 * | Learning, last step | Good  | on/off   | -     | 7m    | 1d (graduates) |
 * | Review              | Good  | on/off   | -     | 2h    | 1d             |
 * | Review, empty steps | Good  | on/off   | -     | 2h    | 2h             |
 */
function getLearningStepInterval(
  resolved: ResolvedLearningSteps,
  grade: Grade,
  { allowModelOverride, graduatingInterval }: LearningStepsContext['config'],
  modelInterval: () => number
): number {
  const stepInterval = resolved.stepIntervals[grade]
  switch (grade) {
    case Rating.Again:
      if (stepInterval === undefined) return modelInterval()
      // Again may follow the model, but never past graduation.
      return allowModelOverride
        ? Math.max(stepInterval, Math.min(modelInterval(), graduatingInterval))
        : stepInterval
    default:
      // Hard, Good, and Easy without a step graduate or stay in review when
      // steps are configured, so they wait at least the graduating interval.
      if (stepInterval === undefined) {
        return resolved.hasSteps
          ? Math.max(modelInterval(), graduatingInterval)
          : modelInterval()
      }
      return allowModelOverride
        ? Math.max(stepInterval, modelInterval())
        : stepInterval
  }
}

function nextLearningState(state: State): State {
  if (state === State.New) return State.Learning
  if (state === State.Review) return State.Relearning
  return state
}
