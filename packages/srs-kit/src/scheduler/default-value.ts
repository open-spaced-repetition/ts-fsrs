/** biome-ignore-all lint/suspicious/noExplicitAny: runtime generic dispatch */

import type {
  AnyChrono,
  ChronoDefaultCtx,
  ChronoDefaultRuntimeFn,
} from '@/chrono/chrono.js'
import type { AnyMiddleware } from '@/middleware/index.js'
import type { AnyModel } from '@/model/model.js'
import { State } from '@/primitives/state.js'
import { isFunction } from '@/schema/index.js'
import type {
  SchedulerDefaultValue,
  SchedulerDefaultValueContext,
} from './scheduler.js'

type DefaultValueContext = SchedulerDefaultValueContext<any>

function applyMiddlewareCardDefaults(
  target: Record<string, unknown>,
  middlewares: readonly AnyMiddleware[],
  ctx: DefaultValueContext
) {
  for (const middleware of middlewares) {
    const defaultValue = middleware.defaultValue?.card
    if (isFunction(defaultValue)) {
      Object.assign(target, defaultValue(ctx))
    }
  }
}

function resolveChronoDefault(
  value: unknown
): ChronoDefaultRuntimeFn | undefined {
  return isFunction(value) ? (value as ChronoDefaultRuntimeFn) : undefined
}

function applyNewCardDefaults(ctx: {
  readonly target: Record<string, unknown>
  readonly defaultValue: DefaultValueContext
  readonly middlewares: readonly AnyMiddleware[]
  readonly chronoDefault?: ChronoDefaultRuntimeFn
  readonly time: ChronoDefaultCtx<unknown, unknown>['time']
}) {
  const { target, defaultValue, middlewares, chronoDefault, time } = ctx

  if (chronoDefault) {
    Object.assign(
      target,
      chronoDefault({
        config: defaultValue.config.chrono as Readonly<unknown>,
        time,
      })
    )
  }

  applyMiddlewareCardDefaults(target, middlewares, defaultValue)
}

export function useComposeDefaultValue(ctx: {
  readonly model: AnyModel
  readonly chrono: AnyChrono
  readonly middlewares: readonly AnyMiddleware[]
}): SchedulerDefaultValue<any> {
  const { model, chrono, middlewares } = ctx
  const chronoCardDefault = resolveChronoDefault(chrono.defaultValue?.card)

  return {
    newCard(defaultValue, time) {
      const { config } = defaultValue
      const card: Record<string, unknown> = model.defaultValue.memoryState({
        config,
      })
      card.state = State.New
      card.scheduleStatus = 'new'
      applyNewCardDefaults({
        target: card,
        defaultValue,
        middlewares,
        chronoDefault: chronoCardDefault,
        time,
      })

      return card as ReturnType<SchedulerDefaultValue<any>['newCard']>
    },
  }
}
