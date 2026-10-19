import type { AnyChrono } from '@/chrono/chrono.js'
import type { AnyMiddleware } from '@/middleware/index.js'
import type { AnyModel } from '@/model/model.js'
import type { Prettify } from '@/schema/index.js'
import { BaseScheduler } from './base.js'
import { createSchedulerDefaultValue } from './default-value.js'
import type { SchedulerEnvFor, SchedulerNameOf } from './infer.js'
import type { CustomScheduler, SchedulerCreate } from './scheduler.js'
import { createSchedulerSchema } from './scheduler-schema.js'

type InitialSchedulerEnv<M extends AnyModel, C extends AnyChrono> = Prettify<
  SchedulerEnvFor<M, C, readonly []>
>

type MiddlewareNode = {
  readonly parent: MiddlewareNode | undefined
  readonly middleware: AnyMiddleware
  readonly length: number
}

const emptyMiddlewares: readonly AnyMiddleware[] = []

function flattenMiddlewares(
  node: MiddlewareNode | undefined
): readonly AnyMiddleware[] {
  if (!node) {
    return emptyMiddlewares
  }

  const middlewares = new Array<AnyMiddleware>(node.length)
  let index = node.length
  for (
    let current: MiddlewareNode | undefined = node;
    current;
    current = current.parent
  ) {
    middlewares[--index] = current.middleware
  }

  return middlewares
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
}): CustomScheduler<SchedulerNameOf<M>, InitialSchedulerEnv<M, C>, M, C> {
  const { model, chrono } = definition

  function build(node?: MiddlewareNode): object {
    let middlewares: readonly AnyMiddleware[] | undefined
    let defaultValue: ReturnType<typeof createSchedulerDefaultValue> | undefined
    let schedulerSchema: ReturnType<typeof createSchedulerSchema> | undefined
    let initialized = false

    const getMiddlewares = () => {
      middlewares ??= flattenMiddlewares(node)
      return middlewares
    }

    const scheduler = {
      name: model.name,
      modelDef: model,
      chronoDef: chrono,
      get defaultValue() {
        defaultValue ??= createSchedulerDefaultValue({
          model,
          chrono,
          middlewares: getMiddlewares(),
        })
        return defaultValue
      },
      get schema() {
        schedulerSchema ??= createSchedulerSchema({
          model,
          chrono,
          middlewares: getMiddlewares(),
        })
        return schedulerSchema
      },
      create(ctx: Parameters<SchedulerCreate<InitialSchedulerEnv<M, C>>>[0]) {
        if (!initialized) {
          schedulerSchema = scheduler.schema
          defaultValue = scheduler.defaultValue
          initialized = true
        }

        // biome-ignore lint/suspicious/noExplicitAny: runtime Env avoids TS7 TS2590
        return new BaseScheduler<any, M, C>({
          model,
          chrono,
          schema: schedulerSchema!,
          defaultValue: defaultValue!,
          middlewares: middlewares!,
          config: ctx.config,
        })
      },
      use(...added: AnyMiddleware[]): object {
        if (added.length === 0) {
          return scheduler
        }

        let child = node
        let length = node?.length ?? 0
        for (const middleware of added) {
          child = {
            parent: child,
            middleware,
            length: ++length,
          }
        }
        return build(child)
      },
    } satisfies Record<keyof CustomScheduler, unknown>

    return scheduler
  }

  return build() as never
}
