import { describe, expect, it } from 'vitest'
import { FSRS7_DEFAULT_WEIGHTS } from './constants.js'
import {
  checkFSRS7Parameters,
  clipFSRS7Parameters,
  migrateFSRS7Parameters,
} from './parameters.js'

// Reference: fsrs-rs c9562d6 and srs-benchmark b4b0254, evaluated in float32.
// Index 26 (base2) follows srs-benchmark's 0.5 floor, which fsrs-rs currently drops.
// biome-ignore format: compact independent reference values.
const referenceClips = [
  {"input":[-1000,-1000,-1000,-1000,-1000,-1000,-1000,-1000,-1000,-1000,-1000,-1000,-1000,-1000,-1000,-1000,-1000,-1000,-1000,-1000,-1000,-1000,-1000,-1000,-1000,-1000,-1000,-1000,-1000,-1000,-1000,-1000,-1000,-1000],"expected":[0.0001,0.0001,0.0001,0.0001,1,0.001,0.1,0,0,0.3,0.01,0.1,0,0,1,0,0,0.5,0.001,0.001,0,0,1,0.01,0.01,0.2,0.5,0.01,0.1,0,0.1,0,0,0]},
  {"input":[1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000],"expected":[50,100,100,100,10,4,4,4,1.2,3,1.5,1,3.5,1,7,4,2,6,1.5,1,5,1,7,0.25,0.95,0.85,0.99,1,1,0.9,1.1,1,0.6,0.6]},
  {"input":[5,3,2,1,6.1686,0.6457,3.6807,1.9795,0,1.3826,0.7024,0.5999,0.8146,0.6398,1,1.3207,0.6707,3.8668,0.4416,0.0934,1.8631,0.6162,1.0869,0.1567,0.0801,0.3,0.2,0.1433,0.7145,0,0.5667,0.3734,0.5333,0.3048],"expected":[5,5,5,5,6.1686,0.6457,3.6807,1.9795,0,1.3826,0.7024,0.5999,0.8146,0.6398,1,1.3207,0.6707,3.8668,0.4416,0.0934,1.8631,0.6162,1.0869,0.1567,0.0801,0.3,0.5,0.1433,0.7145,0,0.5667,0.3734,0.5333,0.3048]}
]

describe('FSRS-7 parameters', () => {
  it('copies defaults and explicit weights without changing the source', () => {
    expect(migrateFSRS7Parameters()).toEqual(FSRS7_DEFAULT_WEIGHTS)
    expect(migrateFSRS7Parameters([])).toEqual(FSRS7_DEFAULT_WEIGHTS)
    expect(migrateFSRS7Parameters(FSRS7_DEFAULT_WEIGHTS)).not.toBe(
      FSRS7_DEFAULT_WEIGHTS
    )
    expect(checkFSRS7Parameters(FSRS7_DEFAULT_WEIGHTS)).toBe(
      FSRS7_DEFAULT_WEIGHTS
    )
    expect(clipFSRS7Parameters(FSRS7_DEFAULT_WEIGHTS)).toEqual(
      FSRS7_DEFAULT_WEIGHTS
    )
  })

  it.each([
    1, 17, 19, 21, 33, 35,
  ])('rejects incompatible %s-parameter layouts', (length) => {
    const weights = Array.from({ length }, () => 1)
    expect(() => migrateFSRS7Parameters(weights)).toThrow('expected 34')
    expect(() => checkFSRS7Parameters(weights)).toThrow()
    expect(clipFSRS7Parameters(weights)).toHaveLength(length)
  })

  it.each(
    referenceClips
  )('clips exactly like fsrs-rs, including dependent bounds', ({
    input,
    expected,
  }) => {
    const before = [...input]
    expect(clipFSRS7Parameters(input)).toEqual(expected)
    expect(input).toEqual(before)
    expect(checkFSRS7Parameters(expected)).toBe(expected)
    expect(clipFSRS7Parameters(expected)).toEqual(expected)
  })

  it('floors base2 at 0.5 when base1 sits below it', () => {
    const weights = [...FSRS7_DEFAULT_WEIGHTS]
    weights[25] = 0.3
    weights[26] = 0.2
    expect(clipFSRS7Parameters(weights)[26]).toBe(0.5)
    expect(migrateFSRS7Parameters(weights)).toEqual(weights)
    expect(() => checkFSRS7Parameters(weights)).toThrow()
  })

  it('raises base2 to base1 once base1 exceeds the 0.5 floor', () => {
    const weights = [...FSRS7_DEFAULT_WEIGHTS]
    weights[25] = 0.7
    weights[26] = 0.6
    expect(clipFSRS7Parameters(weights)[26]).toBe(0.7)
    expect(() => checkFSRS7Parameters(weights)).toThrow()
  })

  it.each([
    Number.NaN,
    Infinity,
    -Infinity,
  ])('repairs non-finite parameters with the lower bound like clamp_safe (%s)', (value) => {
    for (let i = 0; i < 34; i++) {
      const weights = [...FSRS7_DEFAULT_WEIGHTS]
      weights[i] = value
      expect(() => checkFSRS7Parameters(weights)).toThrow()
      const clipped = clipFSRS7Parameters(weights)
      expect(clipped.every(Number.isFinite)).toBe(true)
      expect(() => checkFSRS7Parameters(clipped)).not.toThrow()
    }
  })
})
