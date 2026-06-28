import type { AnyChrono } from '@/chrono/chrono.js'
import type { AnyModel } from '@/model/model.js'
import { isFunction } from '@/schema/index.js'
import type { AnyMiddleware } from './middleware.js'

export type EmptyCardFactory = {
  readonly execute: (ctx: {
    readonly config: {
      readonly model: unknown
      readonly chrono?: unknown
      readonly middleware?: readonly unknown[]
    }
    readonly time: unknown
  }) => Record<string, unknown>
}

export function useComposeEmptyCard(ctx: {
  readonly model: AnyModel
  readonly chrono: AnyChrono
  readonly middlewares: readonly AnyMiddleware[]
}): EmptyCardFactory {
  const { model, chrono, middlewares } = ctx

  return {
    execute({ config, time }) {
      const baseCard: Record<string, unknown> = model.defaultValue.memoryState({
        config: config.model,
      }) as Record<string, unknown>

      const card = Object.assign({}, baseCard)
      const chronoCardDefault = chrono.defaultValue?.card
      if (isFunction(chronoCardDefault)) {
        Object.assign(
          card,
          chronoCardDefault({
            config: config.chrono ?? {},
            time,
          })
        )
      }
      for (const middleware of middlewares) {
        const cardDefault = middleware.defaultValue?.card
        if (isFunction(cardDefault)) {
          Object.assign(
            card,
            cardDefault({
              config,
            })
          )
        }
      }

      return card
    },
  }
}
