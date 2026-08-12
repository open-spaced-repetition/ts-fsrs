import {
  type AnyMiddleware,
  type AnyScheduler,
  defineScheduler,
  type SchedulerCreate,
  type SchedulerEnvFor,
  schedulerStatsMiddleware,
} from '@open-spaced-repetition/srs-kit'
import { dateChrono } from '@open-spaced-repetition/srs-kit/chrono/date'
import type { AnyModel, Model } from '@open-spaced-repetition/srs-kit/model'
import { FSRSValidationError } from '../error.js'
import type { FSRSMemoryStateSchema } from '../kit/schema.js'
import { schedulerDesiredRetentionMiddleware } from '../middlewares/desired-retention/middleware.js'
import { schedulerFuzzingMiddleware } from '../middlewares/fuzzing/middleware.js'
import { schedulerLearningStepsMiddleware } from '../middlewares/learning-steps/middleware.js'
import { schedulerMonotonicIntervalMiddleware } from '../middlewares/monotonic-interval/middleware.js'
import { schedulerScheduledDaysMiddleware } from '../middlewares/scheduled-days/middleware.js'
import type { fsrs6ConfigSchema } from '../models/fsrs-6/parameters.js'

const defaultSchedulerMiddlewares = [
  schedulerDesiredRetentionMiddleware,
  schedulerFuzzingMiddleware,
  schedulerStatsMiddleware,
  schedulerScheduledDaysMiddleware,
  schedulerLearningStepsMiddleware,
  schedulerMonotonicIntervalMiddleware,
] as const

type DefaultSchedulerModel = Model<{
  readonly name: string
  readonly config: typeof fsrs6ConfigSchema
  readonly memoryState: typeof FSRSMemoryStateSchema
  readonly algorithm: unknown
}>

export type DefaultSchedulerCreate = SchedulerCreate<
  SchedulerEnvFor<
    DefaultSchedulerModel,
    typeof dateChrono,
    typeof defaultSchedulerMiddlewares
  >,
  DefaultSchedulerModel,
  typeof dateChrono
>

// Runtime presets are widened to avoid expanding every model's middleware union.
function createRuntimeDefaultSchedulerDefinition(
  model: AnyModel
): AnyScheduler {
  const createDefinition = defineScheduler as unknown as (definition: {
    readonly model: AnyModel
    readonly chrono: typeof dateChrono
  }) => {
    readonly use: (...middlewares: AnyMiddleware[]) => AnyScheduler
  }
  return createDefinition({ model, chrono: dateChrono }).use(
    ...defaultSchedulerMiddlewares
  )
}

export type DefaultSchedulerVersion =
  | 'FSRS-3'
  | 'FSRS-4'
  | 'FSRS-4.5'
  | 'FSRS-5'
  | 'FSRS-6'

type MigrateParameters = (
  parameters?: number[],
  numRelearningSteps?: number,
  enableShortTerm?: boolean
) => number[]

type SchedulerPreset = {
  readonly definition: AnyScheduler
  readonly migrateParameters: MigrateParameters
}

type SchedulerPresetSource = {
  readonly model: AnyModel
  readonly migrateParameters: MigrateParameters
}

const schedulerPresetLoaders: Record<
  DefaultSchedulerVersion,
  () => Promise<SchedulerPresetSource>
> = {
  'FSRS-3': async () => {
    const { FSRS3Model, migrateFSRS3Parameters } = await import(
      '../models/fsrs-3/index.js'
    )
    return {
      model: FSRS3Model,
      migrateParameters: migrateFSRS3Parameters,
    }
  },
  'FSRS-4': async () => {
    const { FSRS4Model, migrateFSRS4Parameters } = await import(
      '../models/fsrs-4/index.js'
    )
    return {
      model: FSRS4Model,
      migrateParameters: migrateFSRS4Parameters,
    }
  },
  'FSRS-4.5': async () => {
    const { FSRS4Dot5Model, migrateFSRS4Dot5Parameters } = await import(
      '../models/fsrs-4dot5/index.js'
    )
    return {
      model: FSRS4Dot5Model,
      migrateParameters: migrateFSRS4Dot5Parameters,
    }
  },
  'FSRS-5': async () => {
    const { FSRS5Model, migrateFSRS5Parameters } = await import(
      '../models/fsrs-5/index.js'
    )
    return {
      model: FSRS5Model,
      migrateParameters: migrateFSRS5Parameters,
    }
  },
  'FSRS-6': async () => {
    const { FSRS6Model, migrateFSRS6Parameters } = await import(
      '../models/fsrs-6/index.js'
    )
    return {
      model: FSRS6Model,
      migrateParameters: migrateFSRS6Parameters,
    }
  },
}

const schedulerPresetCache = new Map<
  DefaultSchedulerVersion,
  Promise<SchedulerPreset>
>()

export async function getSchedulerPreset(
  version: DefaultSchedulerVersion | undefined
): Promise<SchedulerPreset> {
  const resolvedVersion = version ?? 'FSRS-6'
  if (!Object.hasOwn(schedulerPresetLoaders, resolvedVersion)) {
    throw new FSRSValidationError(`Unsupported FSRS version "${version}"`)
  }

  let preset = schedulerPresetCache.get(resolvedVersion)
  if (!preset) {
    preset = schedulerPresetLoaders[resolvedVersion]().then(
      ({ model, migrateParameters }) => ({
        definition: createRuntimeDefaultSchedulerDefinition(model),
        migrateParameters,
      })
    )
    schedulerPresetCache.set(resolvedVersion, preset)
  }
  return preset
}
