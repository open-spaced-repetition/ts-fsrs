import {
  configureScheduler,
  defineSchedulerMiddleware,
  desiredRetentionMiddleware,
  type IScheduler,
  intervalMiddleware,
  learningStepFieldSchema,
  learningStepMiddleware,
  monotonicIntervalMiddleware,
  type PreviewResult,
  type ReviewCard,
  type ReviewResult,
  type SchedulerConfigInput,
  type SchedulerMiddleware,
  type SchedulerModelDefinition,
  type SchedulerPreviewInput,
  type SchedulerResetInput,
  type SchedulerResetResult,
  type SchedulerReviewInput,
  type SchedulerRollbackInput,
  statsFieldSchema,
  statsMiddleware,
  statsRevlogSchema,
} from '../kit/scheduler/index.js'
import { parseReviewRating } from '../kit/validation.js'
import { fuzzMiddleware } from '../middlewares/fuzzing.js'
import { FSRS6Model } from '../models/fsrs-6/model.js'
import { State } from '../models.js'

export interface SchedulerFeatureFlags {
  readonly stats?: boolean
  readonly desiredRetention?: boolean
  readonly learningSteps?: boolean
  readonly monotonicInterval?: boolean
  readonly interval?: boolean
  readonly fuzz?: boolean
}

export const defaultSchedulerFeatures = Object.freeze({
  stats: true,
  desiredRetention: true,
  learningSteps: true,
  monotonicInterval: true,
  interval: true,
  fuzz: false,
}) as Required<SchedulerFeatureFlags>

type FeatureValue<
  Features extends SchedulerFeatureFlags | undefined,
  Key extends keyof SchedulerFeatureFlags,
  Default extends boolean,
> = Features extends undefined
  ? Default
  : Key extends keyof Features
    ? Features[Key] extends false
      ? false
      : Features[Key] extends true
        ? true
        : Default
    : Default

type FeatureMiddlewares<
  Enabled extends boolean,
  Middleware extends SchedulerMiddleware,
> = Enabled extends true ? [Middleware] : []

type StatsMiddlewareFor<Features extends SchedulerFeatureFlags | undefined> =
  FeatureValue<Features, 'stats', true> extends true
    ? typeof statsMiddleware
    : typeof statsFieldsMiddleware

type LearningStepMiddlewareFor<
  Features extends SchedulerFeatureFlags | undefined,
> =
  FeatureValue<Features, 'learningSteps', true> extends true
    ? typeof learningStepMiddleware
    : typeof learningStepFieldsMiddleware

export type DefaultSchedulerMiddlewares<
  Features extends SchedulerFeatureFlags | undefined = undefined,
> = [
  StatsMiddlewareFor<Features>,
  ...FeatureMiddlewares<
    FeatureValue<Features, 'desiredRetention', true>,
    typeof desiredRetentionMiddleware
  >,
  LearningStepMiddlewareFor<Features>,
  ...FeatureMiddlewares<
    FeatureValue<Features, 'monotonicInterval', true>,
    typeof monotonicIntervalMiddleware
  >,
  ...FeatureMiddlewares<
    FeatureValue<Features, 'fuzz', false>,
    typeof fuzzMiddleware
  >,
  ...FeatureMiddlewares<
    FeatureValue<Features, 'interval', true>,
    typeof intervalMiddleware
  >,
]

export type SchedulerMiddlewares<
  Features extends SchedulerFeatureFlags | undefined,
  CustomMiddlewares extends readonly SchedulerMiddleware[],
> = [...DefaultSchedulerMiddlewares<Features>, ...CustomMiddlewares]

export interface SchedulerOptions<
  Model extends SchedulerModelDefinition = typeof FSRS6Model,
  CustomMiddlewares extends readonly SchedulerMiddleware[] = readonly [],
  Features extends SchedulerFeatureFlags | undefined = undefined,
> {
  readonly model?: Model
  readonly config: SchedulerConfigInput<
    Model,
    SchedulerMiddlewares<Features, CustomMiddlewares>
  >
  readonly features?: Features
  readonly middlewares?: CustomMiddlewares
}

export function getDefaultSchedulerMiddlewares<
  const Features extends SchedulerFeatureFlags | undefined = undefined,
>(features?: Features): DefaultSchedulerMiddlewares<Features> {
  const resolved = {
    ...defaultSchedulerFeatures,
    ...features,
  }
  const middlewares: SchedulerMiddleware[] = []

  middlewares.push(resolved.stats ? statsMiddleware : statsFieldsMiddleware)
  if (resolved.desiredRetention) middlewares.push(desiredRetentionMiddleware)
  middlewares.push(
    resolved.learningSteps
      ? learningStepMiddleware
      : learningStepFieldsMiddleware
  )
  if (resolved.monotonicInterval) {
    middlewares.push(monotonicIntervalMiddleware)
  }
  if (resolved.fuzz) middlewares.push(fuzzMiddleware)
  if (resolved.interval) middlewares.push(intervalMiddleware)

  return middlewares as DefaultSchedulerMiddlewares<Features>
}

const statsFieldsMiddleware = defineSchedulerMiddleware({
  fieldsSchema: {
    card: statsFieldSchema,
    revlog: statsRevlogSchema,
    default: {
      reps: 0,
      state: State.New,
      lapses: 0,
    },
  },
  rollback(ctx, next) {
    next()

    ctx.result.reps = ctx.input.card.reps
    ctx.result.lapses = ctx.input.card.lapses
  },
})

const learningStepFieldsMiddleware = defineSchedulerMiddleware({
  fieldsSchema: {
    card: learningStepFieldSchema,
    default: {
      steps: 0,
      state: State.New,
    },
  },
})

export class Scheduler<
  Model extends SchedulerModelDefinition = typeof FSRS6Model,
  CustomMiddlewares extends readonly SchedulerMiddleware[] = readonly [],
  Features extends SchedulerFeatureFlags | undefined = undefined,
  Middlewares extends readonly SchedulerMiddleware[] = SchedulerMiddlewares<
    Features,
    CustomMiddlewares
  >,
> {
  readonly model: ReturnType<Model['create']>
  private readonly scheduler: IScheduler<Model, Middlewares>

  constructor(options: SchedulerOptions<Model, CustomMiddlewares, Features>) {
    const model = (options.model ?? FSRS6Model) as Model
    const middlewares = [
      ...getDefaultSchedulerMiddlewares(options.features),
      ...(options.middlewares ?? []),
    ] as unknown as Middlewares
    const createScheduler = configureScheduler({
      model,
      middlewares,
    })
    this.scheduler = createScheduler(
      options.config as unknown as SchedulerConfigInput<Model, Middlewares>
    )
    this.model = this.scheduler.model
  }

  review(
    input: SchedulerReviewInput<Model, Middlewares>
  ): ReviewResult<Model, Middlewares> {
    parseReviewRating(input.rating)
    return this.scheduler.review(input)
  }

  preview(
    input: SchedulerPreviewInput<Model, Middlewares>
  ): PreviewResult<Model, Middlewares> {
    return this.scheduler.preview(input)
  }

  rollback(
    input: SchedulerRollbackInput<Model, Middlewares>
  ): ReviewCard<Model, Middlewares> {
    return this.scheduler.rollback(input)
  }

  forget(
    input: SchedulerResetInput<Model, Middlewares>
  ): SchedulerResetResult<Model, Middlewares> {
    return this.scheduler.reset(input)
  }
}

export function createScheduler<
  Model extends SchedulerModelDefinition = typeof FSRS6Model,
  const CustomMiddlewares extends readonly SchedulerMiddleware[] = readonly [],
  const Features extends SchedulerFeatureFlags | undefined = undefined,
>(
  options: SchedulerOptions<Model, CustomMiddlewares, Features>
): Scheduler<Model, CustomMiddlewares, Features> {
  return new Scheduler<Model, CustomMiddlewares, Features>(options)
}
