/** biome-ignore-all lint/suspicious/noExplicitAny: runtime generic dispatch */

import type { AnyChrono } from '@/chrono/chrono.js'
import type { AnyModel } from '@/model/model.js'
import { BaseScheduler } from './base.js'
import { composeSchema } from './compose-schema.js'
import { useComposeDefaultValue } from './default-value.js'
import { SRSSchedulerError } from './error.js'
import type { SchedulerEnvFor, SchedulerNameOf } from './infer.js'
import type { AnyMiddleware } from './middleware.js'
import type { ComposableScheduler } from './scheduler.js'

type InitialSchedulerEnv<M extends AnyModel, C extends AnyChrono> = {
  readonly [K in keyof SchedulerEnvFor<M, C, readonly []>]: SchedulerEnvFor<
    M,
    C,
    readonly []
  >[K]
}

// ============
// defineScheduler
// ============

export function defineScheduler<
  const M extends AnyModel,
  const C extends AnyChrono,
>(definition: {
  readonly model: M
  readonly chrono: C
}): ComposableScheduler<SchedulerNameOf<M>, InitialSchedulerEnv<M, C>> {
  const { model, chrono } = definition

  /**
   * Shared middleware pointer used by schema/core/defaultValue composition.
   * use() mutates this array so existing composed runtime objects can observe
   * newly registered middleware without rebuilding schemas or core factories.
   */
  const middlewares: AnyMiddleware[] = []

  const defaultValue = useComposeDefaultValue({
    model,
    chrono,
    middlewares,
  })

  const schedulerSchema = composeSchema({ model, chrono, middlewares })
  let locked = false
  const scheduler: ComposableScheduler<
    SchedulerNameOf<M>,
    InitialSchedulerEnv<M, C>
  > = {
    name: model.name,
    schema: schedulerSchema,
    create(ctx) {
      locked = true
      return new BaseScheduler<InitialSchedulerEnv<M, C>>({
        model,
        chrono,
        schema: schedulerSchema,
        defaultValue,
        middlewares,
        config: ctx.config,
      })
    },
    use(...added) {
      if (locked) {
        throw new SRSSchedulerError(
          'Cannot add middleware after scheduler.create()'
        )
      }
      middlewares.push(...added)
      return scheduler as never
    },
  }

  return scheduler
}
