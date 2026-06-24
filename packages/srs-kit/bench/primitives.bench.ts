// Benchmarks use schema.safeParse() instead of schema.parse().
// parse() throws on invalid input — constructing Error + stack trace costs ~40x,
// making invalid-path numbers reflect throw overhead, not validation speed.
// safeParse() returns { success, data/issues } without throwing,
// so both valid and invalid paths measure pure validation cost.

import { bench, describe } from 'vitest'
import { gradeSchema, Rating, ratingSchema } from '@/primitives/rating.js'
import { State, stateSchema } from '@/primitives/state.js'

describe('ratingSchema (safeParse)', () => {
  bench('valid rating', () => {
    ratingSchema.safeParse(Rating.Good)
  })

  bench('invalid rating', () => {
    ratingSchema.safeParse(5)
  })
})

describe('ratingSchema (parse)', () => {
  bench('valid rating', () => {
    ratingSchema.parse(Rating.Good)
  })

  bench('invalid rating', () => {
    try {
      ratingSchema.parse(5)
    } catch {}
  })
})

describe('gradeSchema (safeParse)', () => {
  bench('valid grade', () => {
    gradeSchema.safeParse(Rating.Easy)
  })

  bench('invalid grade (Manual)', () => {
    gradeSchema.safeParse(Rating.Manual)
  })
})

describe('stateSchema (safeParse)', () => {
  bench('valid state', () => {
    stateSchema.safeParse(State.Review)
  })

  bench('invalid state', () => {
    stateSchema.safeParse(4)
  })
})
