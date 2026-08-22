import { Rating } from '@open-spaced-repetition/srs-kit'
import { expect, it } from 'vitest'
import { FSRS6Algorithm } from './algorithm.js'
import { FSRS6_DEFAULT_WEIGHTS, FSRS6_MODEL_BOUNDS } from './constants.js'

it('rejects an invalid FSRS-6 weight count', () => {
  expect(() => new FSRS6Algorithm([], true, FSRS6_MODEL_BOUNDS)).toThrow(
    'FSRS6Algorithm requires exactly 21 weights'
  )
})

it('clamps initial stability to the FSRS-6 model bounds', () => {
  const algorithm = new FSRS6Algorithm(
    [
      Number.NEGATIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      ...FSRS6_DEFAULT_WEIGHTS.slice(2),
    ],
    true,
    FSRS6_MODEL_BOUNDS
  )

  expect(algorithm.init_stability(Rating.Again)).toBe(FSRS6_MODEL_BOUNDS.sMin)
  expect(algorithm.init_stability(Rating.Hard)).toBe(FSRS6_MODEL_BOUNDS.sMax)
})

it('keeps the memory state for a manual rating', () => {
  const algorithm = new FSRS6Algorithm(
    Array.from(FSRS6_DEFAULT_WEIGHTS),
    true,
    FSRS6_MODEL_BOUNDS
  )
  const memoryState = { difficulty: 5, stability: 10 }

  expect(algorithm.next_state(memoryState, 1, Rating.Manual)).toEqual(
    memoryState
  )
})
