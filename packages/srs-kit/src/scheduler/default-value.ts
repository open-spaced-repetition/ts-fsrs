/** biome-ignore-all lint/suspicious/noExplicitAny: runtime generic dispatch */

import type { AnyChrono, ChronoDefaultRuntimeFn } from '@/chrono/chrono.js'
import type { AnyMiddleware } from '@/middleware/index.js'
import type { AnyModel } from '@/model/model.js'
import { State } from '@/primitives/state.js'
import { emptyRecordPrototype, isFunction } from '@/schema/index.js'
import type { SchedulerDefaultValue } from './scheduler.js'

function resolveChronoDefault(
  value: unknown
): ChronoDefaultRuntimeFn | undefined {
  return isFunction(value) ? (value as ChronoDefaultRuntimeFn) : undefined
}

export function useComposeDefaultValue(ctx: {
  readonly model: AnyModel
  readonly chrono: AnyChrono
  readonly middlewares: readonly AnyMiddleware[]
}): SchedulerDefaultValue<any> {
  const { model, chrono, middlewares } = ctx
  const chronoCardDefault = resolveChronoDefault(chrono.defaultValue?.card)
  const cardDefaults = middlewares
    .map((middleware) => middleware.defaultValue?.card)
    .filter(isFunction)

  return {
    newCard(defaultValue, time) {
      const { config } = defaultValue
      const card: Record<string, unknown> = Object.assign(
        Object.create(emptyRecordPrototype),
        model.defaultValue.memoryState({ config })
      )
      card.state = State.New
      card.scheduleStatus = 'new'
      if (chronoCardDefault) {
        Object.assign(card, chronoCardDefault({ config, time, previous: null }))
      }
      for (const getDefaults of cardDefaults) {
        Object.assign(card, getDefaults(defaultValue))
      }

      return Object.setPrototypeOf(card, Object.prototype) as ReturnType<
        SchedulerDefaultValue<any>['newCard']
      >
    },
  }
}
