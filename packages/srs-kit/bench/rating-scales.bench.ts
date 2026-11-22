import { describe, test } from 'vitest'
import { numericChrono } from '@/chrono/presets/numeric/index.js'
import { schedulerStatsMiddleware } from '@/middleware/stats/index.js'
import { SM2_DEFAULT_WEIGHTS, SM2Model } from '@/model/sm2.test.js'
import {
  SM2_SIX_GRADE_DEFAULT_WEIGHTS,
  SM2SixGradeModel,
} from '@/model/sm2-six-grade.test.js'
import { Rating } from '@/primitives/index.js'
import { defineScheduler } from '@/scheduler/index.js'

let _sink: unknown

function consume<T>(value: T): void {
  _sink = value
}

describe('six-grade SM2 numeric scheduler', () => {
  const config = { weights: SM2_SIX_GRADE_DEFAULT_WEIGHTS }
  const scheduler = defineScheduler({
    model: SM2SixGradeModel,
    chrono: numericChrono,
  }).use(schedulerStatsMiddleware)

  const core = scheduler.create({ config })
  const newCard = core.newCard({ now: 0 })
  const reviewCard = core.review({
    card: newCard,
    grade: 4,
    now: 0,
  }).card

  test('six-grade review new card', async ({ bench }) => {
    await bench('six-grade review new card', () => {
      consume(core.review({ card: newCard, grade: 4, now: 0 }))
    }).run()
  })

  test('six-grade review existing card', async ({ bench }) => {
    await bench('six-grade review existing card', () => {
      consume(
        core.review({
          card: reviewCard,
          grade: 4,
          now: reviewCard.interval,
        })
      )
    }).run()
  })

  test('six-grade preview new card', async ({ bench }) => {
    await bench('six-grade preview new card', () => {
      consume(Array.from(core.preview({ card: newCard, now: 0 })))
    }).run()
  })

  test('six-grade preview existing card', async ({ bench }) => {
    await bench('six-grade preview existing card', () => {
      consume(
        Array.from(core.preview({ card: reviewCard, now: reviewCard.interval }))
      )
    }).run()
  })

  test('derived gradeSchema.parse', async ({ bench }) => {
    const { gradeSchema } = core.ratings
    await bench('derived gradeSchema.parse', () => {
      consume(gradeSchema.parse(4))
    }).run()
  })

  test('derived ratingSchema.parse', async ({ bench }) => {
    const { ratingSchema } = core.ratings
    await bench('derived ratingSchema.parse', () => {
      consume(ratingSchema.parse(-1))
    }).run()
  })
})

describe('two-button preview subset', () => {
  const config = { weights: SM2_DEFAULT_WEIGHTS }
  const twoButtonScheduler = defineScheduler({
    model: SM2Model,
    chrono: numericChrono,
    preview: { grades: [Rating.Again, Rating.Good] },
  }).use(schedulerStatsMiddleware)

  const core = twoButtonScheduler.create({ config })
  const newCard = core.newCard({ now: 0 })
  const reviewCard = core.review({
    card: newCard,
    grade: Rating.Good,
    now: 0,
  }).card

  test('two-button preview new card', async ({ bench }) => {
    await bench('two-button preview new card', () => {
      consume(Array.from(core.preview({ card: newCard, now: 0 })))
    }).run()
  })

  test('two-button preview existing card', async ({ bench }) => {
    await bench('two-button preview existing card', () => {
      consume(
        Array.from(core.preview({ card: reviewCard, now: reviewCard.interval }))
      )
    }).run()
  })
})

void _sink
