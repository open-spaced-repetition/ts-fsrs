import { bench, describe } from 'vitest'
import { numericChrono } from '@/chrono/presets/numeric/index.js'
import type { Middleware } from '@/middleware/index.js'
import { schedulerStatsMiddleware } from '@/middleware/stats/index.js'
import { SM2_DEFAULT_WEIGHTS, SM2Model } from '@/model/sm2.test.js'
import { Rating } from '@/primitives/index.js'
import { defineScheduler } from '@/scheduler/index.js'

let benchmarkSink = 0

function consume(value: number): void {
  benchmarkSink = (benchmarkSink + value) % Number.MAX_SAFE_INTEGER
}

function consumeCard(card: Readonly<Record<string, unknown>>): void {
  consume(Number(card.interval ?? 0))
}

function createMiddleware(offset: number): Middleware {
  return {
    name: `bench-${offset}`,
    defaultValue: {
      card() {
        return { [`bench${offset}`]: offset }
      },
    },
    handlers: {
      review(_ctx, next) {
        const result = next()
        consume(offset)
        return result
      },
      rollback(_ctx, next) {
        const result = next()
        consume(offset)
        return result
      },
    },
  } as Middleware
}

type BenchMiddleware = ReturnType<typeof createMiddleware>

function createCore(middlewares: readonly BenchMiddleware[]) {
  const scheduler = defineScheduler({
    model: SM2Model,
    chrono: numericChrono,
  }).use(...middlewares, schedulerStatsMiddleware)
  return scheduler.create({
    config: {
      weights: SM2_DEFAULT_WEIGHTS,
    },
  })
}

const middlewareSets = [
  { label: '0 middleware', middlewares: [] },
  { label: '1 middleware', middlewares: [createMiddleware(1)] },
  {
    label: '2 middlewares',
    middlewares: [createMiddleware(1), createMiddleware(2)],
  },
  {
    label: '4 middlewares',
    middlewares: [
      createMiddleware(1),
      createMiddleware(2),
      createMiddleware(3),
      createMiddleware(4),
    ],
  },
] as const satisfies readonly {
  readonly label: string
  readonly middlewares: readonly BenchMiddleware[]
}[]

for (const { label, middlewares } of middlewareSets) {
  describe(`numeric scheduler (${label})`, () => {
    const core = createCore(middlewares)
    const newCard = core.newCard({ now: 0 })
    const review = core.review({ card: newCard, grade: Rating.Good, now: 0 })
    const reviewCard = review.card
    const reviewRevlog = review.revlog

    bench('create', () => {
      createCore(middlewares)
    })

    bench('newCard', () => {
      consumeCard(core.newCard({ now: 0 }))
    })

    bench('review new card', () => {
      core.review({ card: newCard, grade: Rating.Good, now: 0 })
    })

    bench('review existing card', () => {
      core.review({
        card: reviewCard,
        grade: Rating.Good,
        now: reviewCard.interval,
      })
    })

    bench('preview existing card', () => {
      for (const item of core.preview({
        card: reviewCard,
        now: reviewCard.interval,
      })) {
        consume(item.grade)
      }
    })

    bench('rollback', () => {
      core.rollback({ card: reviewCard, revlog: reviewRevlog })
    })
  })
}
