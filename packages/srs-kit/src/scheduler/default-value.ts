import type {
  AnyChrono,
  ChronoDefaultCtx,
  ChronoDefaultRuntimeFn,
} from '@/chrono/chrono.js'
import type { AnyMiddleware } from '@/middleware/index.js'
import type { AnyModel } from '@/model/model.js'
import { State } from '@/primitives/state.js'
import { isFunction } from '@/schema/index.js'

type DefaultValueConfig = Record<PropertyKey, unknown>

type DefaultValueContext = {
  readonly config: DefaultValueConfig
}

export type SchedulerDefaultValueFactory = {
  readonly newCard: <Card extends object = Record<string, unknown>>(
    ctx: DefaultValueContext & {
      readonly time: unknown
    }
  ) => Card
}

function applyMiddlewareCardDefaults(
  target: Record<string, unknown>,
  middlewares: readonly AnyMiddleware[],
  config: DefaultValueConfig
) {
  for (const middleware of middlewares) {
    const defaultValue = middleware.defaultValue?.card
    if (isFunction(defaultValue)) {
      Object.assign(
        target,
        defaultValue({
          config,
        })
      )
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
  readonly config: DefaultValueConfig
  readonly middlewares: readonly AnyMiddleware[]
  readonly chronoDefault?: ChronoDefaultRuntimeFn
  readonly time: ChronoDefaultCtx<unknown, unknown>['time']
}) {
  const { target, config, middlewares, chronoDefault, time } = ctx

  if (chronoDefault) {
    Object.assign(
      target,
      chronoDefault({
        config: config.chrono as Readonly<unknown>,
        time,
      })
    )
  }

  applyMiddlewareCardDefaults(target, middlewares, config)
}

export function useComposeDefaultValue(ctx: {
  readonly model: AnyModel
  readonly chrono: AnyChrono
  readonly middlewares: readonly AnyMiddleware[]
}): SchedulerDefaultValueFactory {
  const { model, chrono, middlewares } = ctx
  const chronoCardDefault = resolveChronoDefault(chrono.defaultValue?.card)

  return {
    newCard<Card extends object = Record<string, unknown>>({
      config,
      time,
    }: DefaultValueContext & { readonly time: unknown }) {
      const card: Record<string, unknown> = model.defaultValue.memoryState({
        config,
      })
      card.state = State.New
      card.scheduleStatus = 'new'
      applyNewCardDefaults({
        target: card,
        config,
        middlewares,
        chronoDefault: chronoCardDefault,
        time,
      })

      return card as Card
    },
  }
}
