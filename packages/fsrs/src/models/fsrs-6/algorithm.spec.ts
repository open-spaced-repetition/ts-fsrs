import { expect, it } from 'vitest'
import { Rating } from '@/models.js'
import { FSRS6Algorithm } from './algorithm.js'
import { FSRS6_DEFAULT_WEIGHTS, FSRS6_MODEL_BOUNDS } from './constants.js'

it('rejects an invalid FSRS-6 weight count', () => {
  expect(() => new FSRS6Algorithm([], true, FSRS6_MODEL_BOUNDS)).toThrow(
    'FSRS6Algorithm requires exactly 21 weights'
  )
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
