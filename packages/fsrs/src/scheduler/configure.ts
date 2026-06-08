import type {
  PreviewResult,
  ReviewCard,
  ReviewResult,
  SchedulerConfig,
  SchedulerConfigInput,
  SchedulerPreviewInput,
  SchedulerResetInput,
  SchedulerResetResult,
  SchedulerReviewInput,
  SchedulerRollbackInput,
} from './context.js'
import { buildSchedulerDescriptor } from './descriptor.js'
import {
  defineSchedulerMiddlewares,
  type SchedulerMiddleware,
} from './middleware.js'
import type { SchedulerModelDefinition } from './model.js'
import { Runner } from './runner.js'

export interface IScheduler<
  Model extends SchedulerModelDefinition,
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
  reset(
    input: SchedulerResetInput<Model, Middlewares>
  ): SchedulerResetResult<Model, Middlewares>
}

export type SchedulerCreator<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
> = (
  config: SchedulerConfigInput<Model, Middlewares>
) => IScheduler<Model, Middlewares>

export function configureScheduler<
  const Model extends SchedulerModelDefinition,
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
      descriptor.parseConfig(config),
      model.config
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
      reset(input) {
        return runner.reset(input)
      },
    } as IScheduler<Model, Middlewares>
  }

  return createScheduler
}
