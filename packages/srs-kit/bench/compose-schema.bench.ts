import { bench, describe } from 'vitest'
import { numericChrono } from '@/chrono/presets/numeric/index.js'
import type { Middleware } from '@/middleware/index.js'
import { schedulerStatsMiddleware } from '@/middleware/stats/index.js'
import { SM2_DEFAULT_WEIGHTS, SM2Model } from '@/model/sm2.test.js'
import {
  composeSchema,
  getParsedCardMemoryState,
} from '@/scheduler/compose-schema.js'
import { defineScheduler } from '@/scheduler/index.js'

let composeSchemaSink = 0

function consumeParsedCard(value: {
  readonly card: Readonly<Record<string, unknown>>
  readonly memoryState: Readonly<Record<string, unknown>>
}): void {
  composeSchemaSink =
    (composeSchemaSink +
      Number(value.card.interval ?? 0) +
      Number(value.memoryState.reviewStep ?? 0)) %
    Number.MAX_SAFE_INTEGER
}

function consumeCardWithRememberedMemoryState(
  card: Readonly<Record<string, unknown>> & object
): void {
  const memoryState = getParsedCardMemoryState(card)
  if (!memoryState) {
    throw new Error('Parsed card is missing remembered memory state')
  }
  consumeParsedCard({ card, memoryState })
}

function createCard(middlewares: readonly Middleware[]) {
  const scheduler = defineScheduler({
    model: SM2Model,
    chrono: numericChrono,
  }).use(...middlewares)

  return scheduler
    .create({
      config: {
        weights: SM2_DEFAULT_WEIGHTS,
      },
    })
    .newCard({ now: 0 })
}

describe('composeSchema', () => {
  const noMiddleware = [] as const
  const statsMiddlewares = [schedulerStatsMiddleware] as const
  const baseSchema = composeSchema({
    model: SM2Model,
    chrono: numericChrono,
    middlewares: noMiddleware,
  })
  const statsSchema = composeSchema({
    model: SM2Model,
    chrono: numericChrono,
    middlewares: statsMiddlewares,
  })
  const baseCard = createCard(noMiddleware)
  const statsCard = createCard(statsMiddlewares)

  bench('compose schema', () => {
    composeSchema({
      model: SM2Model,
      chrono: numericChrono,
      middlewares: statsMiddlewares,
    })
  })

  bench('parse card without middleware', () => {
    consumeCardWithRememberedMemoryState(baseSchema.card.parse(baseCard))
  })

  bench('parse card with stats middleware', () => {
    consumeCardWithRememberedMemoryState(statsSchema.card.parse(statsCard))
  })
})
