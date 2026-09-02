import { describe, expect, it } from 'vitest'
import {
  checkFSRS4Parameters,
  clipFSRS4Parameters,
  FSRS4_DEFAULT_WEIGHTS,
  migrateFSRS4Parameters,
} from './index.js'

describe('FSRS-4 parameters', () => {
  const weights = FSRS4_DEFAULT_WEIGHTS

  it('uses the FSRS-4 parameter bounds from the reference implementation', () => {
    expect(
      clipFSRS4Parameters(Array(17).fill(Number.POSITIVE_INFINITY))
    ).toEqual([
      36500, 36500, 36500, 36500, 10, 5, 5, 0.5, 3, 0.8, 2.5, 5, 0.2, 0.9, 2, 1,
      4,
    ])
    expect(
      clipFSRS4Parameters(Array(17).fill(Number.NEGATIVE_INFINITY))
    ).toEqual([
      0.01, 0.01, 0.01, 0.01, 1, 0.1, 0.1, 0, 0, 0.1, 0.01, 0.5, 0.01, 0.01,
      0.01, 0, 1,
    ])
  })

  it('migrates FSRS-4 weights without filling missing parameters', () => {
    expect(migrateFSRS4Parameters()).toEqual(weights)
    expect(migrateFSRS4Parameters(Array.from(weights))).toEqual(weights)
    expect(migrateFSRS4Parameters([1, 2, 3])).toEqual([1, 2, 3])
    expect(migrateFSRS4Parameters([...weights, 1, 1])).toEqual(weights)

    const outOfBounds = [0, ...weights.slice(1)]
    expect(migrateFSRS4Parameters(outOfBounds)).toEqual(outOfBounds)
  })

  it('checks parameter bounds after migration', () => {
    expect(() => checkFSRS4Parameters([1, 2, 3])).toThrow(
      'Expected FSRS4 weights within model bounds.'
    )
    expect(() => checkFSRS4Parameters([0, ...weights.slice(1)])).toThrow(
      'Expected FSRS4 weights within model bounds.'
    )
  })
})
