import { describe, expect, it } from 'vitest'
import { clipFSRS2Parameters } from './parameters.js'

describe('FSRS-2 parameters', () => {
  it('clips 14 FSRS-2 weights to model bounds', () => {
    const weights = Array(14).fill(Number.POSITIVE_INFINITY)

    expect(clipFSRS2Parameters(weights)).toEqual([
      10, 10, 10, -0.01, -0.01, 1, 5, -0.01, -0.01, 2, 5, -0.01, 1, 2,
    ])
  })

  it('clips lower bounds for negative and zero weights', () => {
    expect(
      clipFSRS2Parameters(Array(14).fill(Number.NEGATIVE_INFINITY))
    ).toEqual([0.1, 0.01, 1, -10, -10, 0, 0, -2, -2, 0.01, 0, -2, 0.01, 0.01])
  })
})
