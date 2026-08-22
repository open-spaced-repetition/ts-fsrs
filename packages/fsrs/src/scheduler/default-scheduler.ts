import type { SchedulerDefinition } from '@open-spaced-repetition/srs-kit'
import type { dateChrono } from '@open-spaced-repetition/srs-kit/chrono/date'
import type { AnyModel } from '@open-spaced-repetition/srs-kit/model'
import {
  defaultLearningSteps,
  defaultRelearningSteps,
} from '@/middlewares/learning-steps/schema.js'
import type { StepUnit } from '@/middlewares/learning-steps/types.js'
import { DEFAULT_MAXIMUM_INTERVAL } from '@/middlewares/monotonic-interval/schema.js'
import type {
  DefaultSchedulerCreate,
  DefaultSchedulerVersion,
} from './preset.js'
import { getSchedulerPreset } from './preset.js'

type DefaultSchedulerConfigInput =
  Parameters<DefaultSchedulerCreate>[0]['config']

export interface DefaultSchedulerOptions {
  readonly weights?: readonly number[]
  readonly enableShortTerm?: boolean
  readonly desiredRetention?: number
  readonly learningSteps?: readonly StepUnit[]
  readonly relearningSteps?: readonly StepUnit[]
  readonly enableFuzz?: boolean
  readonly maximumInterval?: number
  /** Whether forget clears reps and lapses; defaults to true. */
  readonly clearStatsOnForget?: boolean
  /**
   * Whether to re-validate internally produced review results. Defaults to
   * `true`. Set to `false` to skip redundant output re-validation; input is
   * always validated.
   */
  readonly check?: boolean
  /** FSRS model and parameter migration version; defaults to FSRS-6. */
  readonly version?: DefaultSchedulerVersion
}

type DefaultSchedulerCore = ReturnType<DefaultSchedulerCreate>
type DefaultSchedulerModelCore = Omit<
  DefaultSchedulerCore['model'],
  'config' | 'algorithm'
> & {
  readonly config: Partial<DefaultSchedulerCore['model']['config']> &
    Pick<DefaultSchedulerCore['model']['config'], 'weights'>
  readonly algorithm: unknown
}

export type DefaultScheduler = Omit<
  DefaultSchedulerCore,
  'model' | 'definition'
> & {
  readonly model: DefaultSchedulerModelCore
  readonly definition: SchedulerDefinition<AnyModel, typeof dateChrono>
}
export type DefaultSchedulerCard = ReturnType<DefaultScheduler['newCard']>
export type DefaultSchedulerCardInput = Parameters<
  DefaultScheduler['review']
>[0]['card']
export type DefaultSchedulerRevlog = ReturnType<
  DefaultScheduler['review']
>['revlog']

export async function DefaultScheduler(
  options: DefaultSchedulerOptions = {}
): Promise<DefaultScheduler> {
  const preset = await getSchedulerPreset(options.version)
  const {
    weights,
    enableShortTerm = true,
    desiredRetention = 0.9,
    learningSteps = defaultLearningSteps,
    relearningSteps = defaultRelearningSteps,
    enableFuzz = false,
    maximumInterval = DEFAULT_MAXIMUM_INTERVAL,
  } = options
  const migratedWeights = preset.migrateParameters(
    weights ? Array.from(weights) : undefined,
    relearningSteps.length,
    enableShortTerm
  )

  return preset.definition.create({
    config: {
      weights: migratedWeights,
      enableShortTerm,
      numRelearningSteps: relearningSteps.length,
      desiredRetention,
      // Frozen copies: the learning-steps middleware memoizes schedules by
      // config identity and only caches when the step arrays are immutable.
      learningSteps: Object.freeze(Array.from(learningSteps)),
      relearningSteps: Object.freeze(Array.from(relearningSteps)),
      enableFuzz,
      maximumInterval,
      clearStatsOnForget: options.clearStatsOnForget,
    } satisfies DefaultSchedulerConfigInput,
    check: options.check,
  }) as unknown as DefaultScheduler
}
