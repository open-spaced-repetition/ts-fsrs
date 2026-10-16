import { describe, test } from 'vitest'
import { numericChrono } from '@/chrono/presets/numeric/index.js'
import type { Middleware } from '@/middleware/index.js'
import { schedulerStatsMiddleware } from '@/middleware/stats/index.js'
import { SM2_DEFAULT_WEIGHTS, SM2Model } from '@/model/sm2.test.js'
import { defineScheduler } from '@/scheduler/index.js'
import {
  createSchedulerSchema,
  parsedCardMemoryStateSymbol,
} from '@/scheduler/scheduler-schema.js'
import { getAttachedValue } from '@/schema/attached-value.js'

let schedulerSchemaSink = 0

function consumeParsedCard(value: {
  readonly card: Readonly<Record<string, unknown>>
  readonly memoryState: Readonly<Record<string, unknown>>
}): void {
  schedulerSchemaSink =
    (schedulerSchemaSink +
      Number(value.card.interval ?? 0) +
      Number(value.memoryState.reviewStep ?? 0)) %
    Number.MAX_SAFE_INTEGER
}

function consumeCardWithRememberedMemoryState(
  card: Readonly<Record<string, unknown>> & object
): void {
  const memoryState = getAttachedValue<
    typeof parsedCardMemoryStateSymbol,
    Record<string, unknown>
  >(card, parsedCardMemoryStateSymbol)
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

describe('createSchedulerSchema', () => {
  const noMiddleware = [] as const
  const statsMiddlewares = [schedulerStatsMiddleware] as const
  const baseSchema = createSchedulerSchema({
    model: SM2Model,
    chrono: numericChrono,
    middlewares: noMiddleware,
  })
  const statsSchema = createSchedulerSchema({
    model: SM2Model,
    chrono: numericChrono,
    middlewares: statsMiddlewares,
  })
  const baseCard = createCard(noMiddleware)
  const statsCard = createCard(statsMiddlewares)

  test('create scheduler schema', async ({ bench }) => {
    await bench('create scheduler schema', () => {
      createSchedulerSchema({
        model: SM2Model,
        chrono: numericChrono,
        middlewares: statsMiddlewares,
      })
    }).run()
  })

  test('parse card without middleware', async ({ bench }) => {
    await bench('parse card without middleware', () => {
      consumeCardWithRememberedMemoryState(baseSchema.card.parse(baseCard))
    }).run()
  })

  test('parse card with stats middleware', async ({ bench }) => {
    await bench('parse card with stats middleware', () => {
      consumeCardWithRememberedMemoryState(statsSchema.card.parse(statsCard))
    }).run()
  })
})
