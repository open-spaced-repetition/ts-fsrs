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
import { createFSRS7MigrationProxy } from './proxy.js'

type DefaultSchedulerConfigInput = Parameters<
  DefaultSchedulerCreate<'FSRS-6'>
>[0]['config']

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
  /** FSRS model and parameter migration version; defaults to FSRS-7. */
  readonly version?: Version
}

type DefaultSchedulerCore = ReturnType<DefaultSchedulerCreate<'FSRS-6'>>
type DefaultSchedulerModelCore = Omit<
  DefaultSchedulerCore['model'],
  'config' | 'algorithm'
> & {
  readonly config: Partial<DefaultSchedulerCore['model']['config']> &
    Pick<DefaultSchedulerCore['model']['config'], 'weights'>
  readonly algorithm: unknown
}

export type DefaultScheduler<
  Version extends DefaultSchedulerVersion = 'FSRS-7',
> = (Version extends 'FSRS-7'
  ? Omit<ReturnType<DefaultSchedulerCreate<'FSRS-7'>>, 'definition'>
  : Omit<DefaultSchedulerCore, 'model' | 'definition'> & {
      readonly model: DefaultSchedulerModelCore
    }) & {
  readonly definition: SchedulerDefinition<AnyModel, typeof dateChrono>
}
export type DefaultSchedulerCard<
  Version extends DefaultSchedulerVersion = 'FSRS-7',
> = Version extends 'FSRS-7'
  ? {
      [Key in keyof ReturnType<
        ReturnType<DefaultSchedulerCreate<'FSRS-7'>>['newCard']
      >]: ReturnType<
        ReturnType<DefaultSchedulerCreate<'FSRS-7'>>['newCard']
      >[Key]
    }
  : {
      [Key in keyof ReturnType<
        ReturnType<DefaultSchedulerCreate<'FSRS-6'>>['newCard']
      >]: ReturnType<
        ReturnType<DefaultSchedulerCreate<'FSRS-6'>>['newCard']
      >[Key]
    }
export type DefaultSchedulerCardInput<
  Version extends DefaultSchedulerVersion = 'FSRS-7',
> = Version extends 'FSRS-7'
  ? {
      [Key in keyof Parameters<
        ReturnType<DefaultSchedulerCreate<'FSRS-7'>>['review']
      >[0]['card']]: Parameters<
        ReturnType<DefaultSchedulerCreate<'FSRS-7'>>['review']
      >[0]['card'][Key]
    }
  : {
      [Key in keyof Parameters<
        ReturnType<DefaultSchedulerCreate<'FSRS-6'>>['review']
      >[0]['card']]: Parameters<
        ReturnType<DefaultSchedulerCreate<'FSRS-6'>>['review']
      >[0]['card'][Key]
    }
export type DefaultSchedulerRevlog<
  Version extends DefaultSchedulerVersion = 'FSRS-7',
> = Version extends 'FSRS-7'
  ? {
      [Key in keyof ReturnType<
        ReturnType<DefaultSchedulerCreate<'FSRS-7'>>['review']
      >['revlog']]: ReturnType<
        ReturnType<DefaultSchedulerCreate<'FSRS-7'>>['review']
      >['revlog'][Key]
    }
  : {
      [Key in keyof ReturnType<
        ReturnType<DefaultSchedulerCreate<'FSRS-6'>>['review']
      >['revlog']]: ReturnType<
        ReturnType<DefaultSchedulerCreate<'FSRS-6'>>['review']
      >['revlog'][Key]
    }

export async function DefaultScheduler<
  Version extends DefaultSchedulerVersion = 'FSRS-7',
>(
  options: DefaultSchedulerOptions<Version> = {}
): Promise<DefaultScheduler<Version>> {
  const version = options.version ?? 'FSRS-7'
  const preset = await getSchedulerPreset(version)
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

  const scheduler = preset.definition.create({
    config: {
      fractionalDays: version === 'FSRS-7',
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

  return version === 'FSRS-7' ? createFSRS7MigrationProxy(scheduler) : scheduler
}
