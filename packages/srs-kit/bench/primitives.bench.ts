// Benchmarks use schema.safeParse() instead of schema.parse().
// parse() throws on invalid input — constructing Error + stack trace costs ~40x,
// making invalid-path numbers reflect throw overhead, not validation speed.
// safeParse() returns { success, data/issues } without throwing,
// so both valid and invalid paths measure pure validation cost.

import { describe, test } from 'vitest'
import { gradeSchema, Rating, ratingSchema } from '@/primitives/rating.js'
import { State, stateSchema } from '@/primitives/state.js'

describe('ratingSchema (safeParse)', () => {
  test('valid rating', async ({ bench }) => {
    await bench('valid rating', () => {
      ratingSchema.safeParse(Rating.Good)
    }).run()
  })

  test('invalid rating', async ({ bench }) => {
    await bench('invalid rating', () => {
      ratingSchema.safeParse(5)
    }).run()
  })
})

describe('ratingSchema (parse)', () => {
  test('valid rating', async ({ bench }) => {
    await bench('valid rating', () => {
      ratingSchema.parse(Rating.Good)
    }).run()
  })

  test('invalid rating', async ({ bench }) => {
    await bench('invalid rating', () => {
      try {
        ratingSchema.parse(5)
      } catch {}
    }).run()
  })
})

describe('gradeSchema (safeParse)', () => {
  test('valid grade', async ({ bench }) => {
    await bench('valid grade', () => {
      gradeSchema.safeParse(Rating.Easy)
    }).run()
  })

  test('invalid grade (Manual)', async ({ bench }) => {
    await bench('invalid grade (Manual)', () => {
      gradeSchema.safeParse(Rating.Manual)
    }).run()
  })
})

describe('stateSchema (safeParse)', () => {
  test('valid state', async ({ bench }) => {
    await bench('valid state', () => {
      stateSchema.safeParse(State.Review)
    }).run()
  })

  test('invalid state', async ({ bench }) => {
    await bench('invalid state', () => {
      stateSchema.safeParse(4)
    }).run()
  })
})
