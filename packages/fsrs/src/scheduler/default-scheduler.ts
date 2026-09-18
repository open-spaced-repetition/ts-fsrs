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

export interface DefaultSchedulerOptions<
  Version extends DefaultSchedulerVersion = DefaultSchedulerVersion,
> {
  readonly weights?: readonly number[]
  /** Enable explicit learning steps. FSRS-7 always retains its intrinsic fast trace. */
  readonly enableShortTerm?: boolean
  readonly desiredRetention?: number
  readonly learningSteps?: readonly StepUnit[]
  readonly relearningSteps?: readonly StepUnit[]
  readonly enableFuzz?: boolean
  readonly maximumInterval?: number
  /** Whether forget clears reps and lapses; defaults to true. */
  readonly clearStatsOnForget?: boolean
  /** FSRS model and parameter migration version; defaults to FSRS-6. */
  readonly version?: Version
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

export type DefaultScheduler<
  Version extends DefaultSchedulerVersion = 'FSRS-6',
> = (Version extends 'FSRS-7'
  ? Omit<ReturnType<DefaultSchedulerCreate<'FSRS-7'>>, 'definition'>
  : Omit<DefaultSchedulerCore, 'model' | 'definition'> & {
      readonly model: DefaultSchedulerModelCore
    }) & {
  readonly definition: SchedulerDefinition<AnyModel, typeof dateChrono>
}
export type DefaultSchedulerCard<
  Version extends DefaultSchedulerVersion = 'FSRS-6',
> = ReturnType<DefaultScheduler<Version>['newCard']>
export type DefaultSchedulerCardInput<
  Version extends DefaultSchedulerVersion = 'FSRS-6',
> = Parameters<DefaultScheduler<Version>['review']>[0]['card']
export type DefaultSchedulerRevlog<
  Version extends DefaultSchedulerVersion = 'FSRS-6',
> = ReturnType<DefaultScheduler<Version>['review']>['revlog']

export async function DefaultScheduler<
  Version extends DefaultSchedulerVersion = 'FSRS-6',
>(
  options: DefaultSchedulerOptions<Version> = {}
): Promise<DefaultScheduler<Version>> {
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
      fractionalDays: options.version === 'FSRS-7',
      weights: migratedWeights,
      enableShortTerm,
      numRelearningSteps: relearningSteps.length,
      desiredRetention,
      learningSteps: Array.from(learningSteps),
      relearningSteps: Array.from(relearningSteps),
      enableFuzz,
      maximumInterval,
      clearStatsOnForget: options.clearStatsOnForget,
    } satisfies DefaultSchedulerConfigInput,
  }) as unknown as DefaultScheduler<Version>
}
