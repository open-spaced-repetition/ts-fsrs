import { describe, expect, it } from 'vitest'
import { calculateScheduleDay, calculateScheduleDays } from './core.js'

describe('calculateScheduleDays', () => {
  it('keeps the first interval and advances each later rating', () => {
    expect(calculateScheduleDays([4], 100)).toEqual([4])
    expect(calculateScheduleDays([4, 2], 100)).toEqual([4, 5])
    expect(calculateScheduleDays([4, 2, 8], 100)).toEqual([4, 5, 8])
    expect(calculateScheduleDays([4, 2, 8, 7], 100)).toEqual([4, 5, 8, 9])
  })

  it('preserves already monotonic intervals', () => {
    expect(calculateScheduleDays([2, 4, 8, 16], 100)).toEqual([2, 4, 8, 16])
  })

  it('allows equal intervals once the maximum is reached', () => {
    expect(calculateScheduleDays([98, 99, 100, 101], 100)).toEqual([
      98, 99, 100, 100,
    ])
    expect(calculateScheduleDays([100, 100, 100], 100)).toEqual([100, 100, 100])
  })

  it('caps the first interval without comparing it with the next rating', () => {
    expect(calculateScheduleDays([102], 100)).toEqual([100])
    expect(calculateScheduleDays([102, 101, 100], 100)).toEqual([100, 100, 100])
  })

  it('does not mutate the candidate tuple', () => {
    const candidates = [8, 5, 4, 3] as const

    const result = calculateScheduleDays(candidates, 100)
    result[0] = 1

    expect(candidates).toEqual([8, 5, 4, 3])
  })

  it('returns the current rating interval', () => {
    expect(calculateScheduleDay([4], 100)).toBe(4)
    expect(calculateScheduleDay([4, 2], 100)).toBe(5)
    expect(calculateScheduleDay([4, 2, 8], 100)).toBe(8)
    expect(calculateScheduleDay([4, 2, 8, 7], 100)).toBe(9)
  })
})
