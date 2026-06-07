import type {
  PreviewResult,
  ReviewCard,
  ReviewResult,
  SchedulerConfig,
  SchedulerConfigInput,
  SchedulerPreviewInput,
  SchedulerReviewInput,
  SchedulerRollbackInput,
} from './context.js'
import { buildSchedulerDescriptor } from './descriptor.js'
import {
  defineSchedulerMiddlewares,
  type SchedulerMiddleware,
} from './middleware.js'
import type { SchedulerModelFactory } from './model.js'
import { Runner } from './runner.js'

export interface IScheduler<
  Model extends SchedulerModelFactory,
  Middlewares extends readonly SchedulerMiddleware[],
> {
  review(
    input: SchedulerReviewInput<Model, Middlewares>
  ): ReviewResult<Model, Middlewares>
  preview(
    input: SchedulerPreviewInput<Model, Middlewares>
  ): PreviewResult<Model, Middlewares>
  rollback(
    input: SchedulerRollbackInput<Model, Middlewares>
  ): ReviewCard<Model, Middlewares>
}

export type SchedulerCreator<
  Model extends SchedulerModelFactory,
  Middlewares extends readonly SchedulerMiddleware[],
> = (
  config: SchedulerConfigInput<Model, Middlewares>
) => IScheduler<Model, Middlewares>

export function configureScheduler<
  const Model extends SchedulerModelFactory,
  const Middlewares extends readonly SchedulerMiddleware[] = readonly [],
>(options: {
  readonly model: Model
  readonly middlewares?: Middlewares
}): SchedulerCreator<Model, Middlewares> {
  const middlewares = defineSchedulerMiddlewares(
    ...(options.middlewares ?? [])
  ) as Middlewares
  const descriptor = buildSchedulerDescriptor(options.model, middlewares)

  const createScheduler = (
    config: SchedulerConfigInput<Model, Middlewares>
  ) => {
    const model = options.model.create(config) as ReturnType<Model['create']>
    const schedulerConfig = Object.assign(
      {},
      model.config,
      descriptor.parseConfig(config)
    ) as SchedulerConfig<Model, Middlewares>

    const optionsWithConfig = {
      descriptor,
      model,
      config: schedulerConfig,
    }
    const runner = new Runner<Model, Middlewares>(optionsWithConfig)

    return {
      review(input) {
        return runner.review(input)
      },
      preview(input) {
        return runner.preview(input)
      },
      rollback(input) {
        return runner.rollback(input)
      },
    } as IScheduler<Model, Middlewares>
  }

  return createScheduler
}
