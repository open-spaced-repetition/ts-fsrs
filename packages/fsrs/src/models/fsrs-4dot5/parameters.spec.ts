import { describe, expect, it } from 'vitest'
import {
  checkFSRS4Dot5Parameters,
  clipFSRS4Dot5Parameters,
  FSRS4Dot5_DEFAULT_WEIGHTS,
  migrateFSRS4Dot5Parameters,
} from './index.js'

describe('FSRS-4.5 parameters', () => {
  const weights = FSRS4Dot5_DEFAULT_WEIGHTS

  it('uses the FSRS-4.5 parameter bounds from the reference implementation', () => {
    expect(
      clipFSRS4Dot5Parameters(Array(17).fill(Number.POSITIVE_INFINITY))
    ).toEqual([
      100, 100, 100, 100, 10, 5, 5, 0.8, 6, 0.8, 5, 6, 0.4, 0.9, 4, 1, 10,
    ])
  })

  it('migrates FSRS-4.5 weights without rejecting longer parameter arrays', () => {
    expect(migrateFSRS4Dot5Parameters()).toEqual(weights)
    expect(migrateFSRS4Dot5Parameters([1, 2, 3])).toEqual([1, 2, 3])
    expect(migrateFSRS4Dot5Parameters([...weights, 1, 1])).toEqual(weights)

    const outOfBounds = [0, ...weights.slice(1)]
    expect(migrateFSRS4Dot5Parameters(outOfBounds)).toEqual(outOfBounds)
  })

  it('checks parameter bounds after migration', () => {
    expect(() => checkFSRS4Dot5Parameters([1, 2, 3])).toThrow(
      'Expected FSRS4.5 weights within model bounds.'
    )
    expect(() => checkFSRS4Dot5Parameters([0, ...weights.slice(1)])).toThrow(
      'Expected FSRS4.5 weights within model bounds.'
    )
  })
})
