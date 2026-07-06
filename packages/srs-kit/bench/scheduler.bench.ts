import { bench, describe } from 'vitest'
import { numericChrono } from '@/chrono/presets/numeric/index.js'
import { schedulerStatsMiddleware } from '@/middleware/stats/index.js'
import { SM2_DEFAULT_WEIGHTS, SM2Model } from '@/model/sm2.test.js'
import { Rating } from '@/primitives/index.js'
import { defineScheduler } from '@/scheduler/index.js'

let _schedulerSink: unknown

function consumeSchedulerName(value: string | symbol): void {
  _schedulerSink = value
}

describe('SM2 numeric scheduler', () => {
  const scheduler = defineScheduler({
    model: SM2Model,
    chrono: numericChrono,
  }).use(schedulerStatsMiddleware)

  const config = {
    weights: SM2_DEFAULT_WEIGHTS,
  }
  const core = scheduler.create({ config })
  const newCard = core.newCard({ now: 0 })
  const reviewCard = core.review({
    card: newCard,
    grade: Rating.Good,
    now: 0,
  }).card

  function consumePreview(previews: ReturnType<typeof core.preview>) {
    return Array.from(previews)
  }

  bench('create', () => {
    scheduler.create({ config })
  })

  bench('newCard', () => {
    core.newCard({ now: 0 })
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

  bench('preview new card', () => {
    consumePreview(core.preview({ card: newCard, now: 0 }))
  })

  bench('preview existing card', () => {
    consumePreview(core.preview({ card: reviewCard, now: reviewCard.interval }))
  })
})

describe('defineScheduler composition', () => {
  bench('defineScheduler()', () => {
    const scheduler = defineScheduler({
      model: SM2Model,
      chrono: numericChrono,
    })
    consumeSchedulerName(scheduler.name)
  })

  bench('defineScheduler().use(stats)', () => {
    const scheduler = defineScheduler({
      model: SM2Model,
      chrono: numericChrono,
    }).use(schedulerStatsMiddleware)
    consumeSchedulerName(scheduler.name)
  })
})
