import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Grade } from '../../models.js'
import type { SchemaInput, SchemaOutput } from '../helper-types.js'
import type { FSRSModelConfig, IFSRSModel } from '../types.js'
import type {
  SchedulerConfigInput,
  SchedulerInput,
  SchedulerMiddlewareInput,
  SchedulerMiddlewareResult,
  SchedulerResult,
  SchedulerRollbackInput,
} from './scheduler-context.js'
import type { SchedulerMiddleware } from './scheduler-middleware.js'

type SchedulerModelConfig<ModelConfig extends StandardSchemaV1> =
  StandardSchemaV1<SchemaInput<ModelConfig>, SchemaOutput<ModelConfig>>

type SchedulerOptionsConfig<
  ModelConfig extends StandardSchemaV1,
  Middlewares extends readonly SchedulerMiddleware[],
> = SchedulerConfigInput<SchemaInput<ModelConfig>, Middlewares>

export interface SchedulerOptions<
  ModelConfig extends
    StandardSchemaV1<FSRSModelConfig> = StandardSchemaV1<FSRSModelConfig>,
  Middlewares extends readonly SchedulerMiddleware[] = [],
> {
  readonly Model: (
    config: SchedulerOptionsConfig<ModelConfig, Middlewares>
  ) => IFSRSModel<SchedulerModelConfig<ModelConfig>>
  readonly middlewares?: Middlewares
  readonly config: SchedulerOptionsConfig<ModelConfig, Middlewares>
}

export interface IScheduler<
  MemoryState,
  Middlewares extends readonly SchedulerMiddleware[] = [],
> {
  review<Input extends SchedulerMiddlewareInput<MemoryState, Middlewares>>(
    input: Input
  ): SchedulerMiddlewareResult<MemoryState, Middlewares, Input>

  rollback<
    Fields extends StandardSchemaV1 = StandardSchemaV1,
    ReviewInput extends SchedulerInput<MemoryState, Fields> = SchedulerInput<
      MemoryState,
      Fields
    >,
    Input extends SchedulerRollbackInput<
      MemoryState,
      Fields,
      ReviewInput
    > = SchedulerRollbackInput<MemoryState, Fields, ReviewInput>,
  >(input: Input): SchedulerResult<MemoryState, Fields, ReviewInput>['card']

  preview<
    Input extends Omit<
      SchedulerMiddlewareInput<MemoryState, Middlewares>,
      'rating'
    >,
  >(
    input: Input
  ): Record<
    Grade,
    SchedulerMiddlewareResult<
      MemoryState,
      Middlewares,
      Input & Pick<SchedulerMiddlewareInput<MemoryState, Middlewares>, 'rating'>
    >
  >
}
