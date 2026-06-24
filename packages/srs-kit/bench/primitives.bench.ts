// Benchmarks use safeParse instead of parse.
// parse throws on invalid input — constructing Error + stack trace costs ~40x,
// making invalid-path numbers reflect throw overhead, not validation speed.
// safeParse returns { success, data/issues } without throwing,
// so both valid and invalid paths measure pure validation cost.

import { bench, describe } from 'vitest'
import { gradeSchema, Rating, ratingSchema } from '@/primitives/rating.js'
import { State, stateSchema } from '@/primitives/state.js'
import { parse, safeParse } from '@/schema/index.js'

describe('ratingSchema (safeParse)', () => {
  bench('valid rating', () => {
    safeParse(ratingSchema, Rating.Good)
  })

  bench('invalid rating', () => {
    safeParse(ratingSchema, 5)
  })
})

describe('ratingSchema (parse)', () => {
  bench('valid rating', () => {
    parse(ratingSchema, Rating.Good)
  })

  bench('invalid rating', () => {
    try {
      parse(ratingSchema, 5)
    } catch {}
  })
})

describe('gradeSchema (safeParse)', () => {
  bench('valid grade', () => {
    safeParse(gradeSchema, Rating.Easy)
  })

  bench('invalid grade (Manual)', () => {
    safeParse(gradeSchema, Rating.Manual)
  })
})

describe('stateSchema (safeParse)', () => {
  bench('valid state', () => {
    safeParse(stateSchema, State.Review)
  })

  bench('invalid state', () => {
    safeParse(stateSchema, 4)
  })
})
