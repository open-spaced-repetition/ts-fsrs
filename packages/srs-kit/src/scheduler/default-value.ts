import type {
  AnyChrono,
  ChronoDefaultCtx,
  ChronoDefaultRuntimeFn,
} from '@/chrono/chrono.js'
import type { AnyModel } from '@/model/model.js'
import { isFunction } from '@/schema/index.js'
import type { AnyMiddleware } from './middleware.js'

type DefaultValueConfig = Record<PropertyKey, unknown>

type DefaultValueContext = {
  readonly config: DefaultValueConfig
}

type DefaultValueTimeContext = DefaultValueContext & {
  readonly time: ChronoDefaultCtx<unknown, unknown>['time']
  readonly previous?: ChronoDefaultCtx<unknown, unknown>['previous']
}

export type SchedulerDefaultValueFactory = {
  readonly newCard: <Card extends object = Record<string, unknown>>(
    ctx: DefaultValueContext & {
      readonly time: unknown
    }
  ) => Card
  readonly card: <Card extends object = Record<string, unknown>>(
    ctx: DefaultValueTimeContext
  ) => Card
  readonly revlog: <Revlog extends object = Record<string, unknown>>(
    ctx: DefaultValueTimeContext
  ) => Revlog
}

function applyMiddlewareDefaults(
  target: Record<string, unknown>,
  middlewares: readonly AnyMiddleware[],
  key: 'card' | 'revlog',
  config: DefaultValueConfig
) {
  for (const middleware of middlewares) {
    const defaultValue = middleware.defaultValue?.[key]
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

function applyFieldDefaults(ctx: {
  readonly target: Record<string, unknown>
  readonly config: DefaultValueConfig
  readonly middlewares: readonly AnyMiddleware[]
  readonly key: 'card' | 'revlog'
  readonly chronoDefault?: ChronoDefaultRuntimeFn
  readonly time: ChronoDefaultCtx<unknown, unknown>['time']
  readonly previous?: ChronoDefaultCtx<unknown, unknown>['previous']
}) {
  const { target, config, middlewares, key, chronoDefault, time, previous } =
    ctx

  if (chronoDefault) {
    Object.assign(
      target,
      chronoDefault({
        config: config.chrono as Readonly<unknown>,
        time,
        previous,
      })
    )
  }

  applyMiddlewareDefaults(target, middlewares, key, config)
}

export function useComposeDefaultValue(ctx: {
  readonly model: AnyModel
  readonly chrono: AnyChrono
  readonly middlewares: readonly AnyMiddleware[]
}): SchedulerDefaultValueFactory {
  const { model, chrono, middlewares } = ctx
  const chronoCardDefault = resolveChronoDefault(chrono.defaultValue?.card)
  const chronoRevlogDefault = resolveChronoDefault(chrono.defaultValue?.revlog)

  return {
    newCard<Card extends object = Record<string, unknown>>({
      config,
      time,
    }: DefaultValueContext & { readonly time: unknown }) {
      const card: Record<string, unknown> = model.defaultValue.memoryState({
        config,
      })
      card.scheduleStatus = 'new'
      card.scheduledDays = 0
      applyFieldDefaults({
        target: card,
        config,
        middlewares,
        key: 'card',
        chronoDefault: chronoCardDefault,
        time,
      })

      return card as Card
    },
    card<Card extends object = Record<string, unknown>>({
      config,
      time,
      previous,
    }: DefaultValueTimeContext) {
      const card: Record<string, unknown> = {}
      applyFieldDefaults({
        target: card,
        config,
        middlewares,
        key: 'card',
        chronoDefault: chronoCardDefault,
        time,
        previous,
      })

      return card as Card
    },
    revlog<Revlog extends object = Record<string, unknown>>({
      config,
      time,
      previous,
    }: DefaultValueTimeContext) {
      const revlog: Record<string, unknown> = {}
      applyFieldDefaults({
        target: revlog,
        config,
        middlewares,
        key: 'revlog',
        chronoDefault: chronoRevlogDefault,
        time,
        previous,
      })

      return revlog as Revlog
    },
  }
}
