import { describe, expect, it, vi } from 'vitest'
import { fnv1aMulberry32Rng, getFuzzRange, withFuzzing } from './core.js'

const config = {
  enableFuzz: true,
  maximumInterval: 36_500,
}

describe('fuzzing core', () => {
  it('rounds when fuzzing is disabled or the interval is too short', () => {
    expect(withFuzzing(3.4, 1, { ...config, enableFuzz: false }, 'seed')).toBe(
      3
    )
    expect(withFuzzing(2.4, 1, config, 'seed')).toBe(2)
  })

  it('fuzzes the 2.5 interval boundary inside its range', () => {
    const range = getFuzzRange(2.5, 0, config.maximumInterval)
    const interval = withFuzzing(2.5, 0, config, 'boundary-seed')

    expect(interval).toBeGreaterThanOrEqual(range.minInterval)
    expect(interval).toBeLessThanOrEqual(range.maxInterval)
  })

  it('applies deterministic fuzzing inside the computed range', () => {
    const first = withFuzzing(10, 5, config, 'stable-seed')
    const second = withFuzzing(10, 5, config, 'stable-seed')
    const range = getFuzzRange(10, 5, config.maximumInterval)

    expect(second).toBe(first)
    expect(first).toBeGreaterThanOrEqual(range.minInterval)
    expect(first).toBeLessThanOrEqual(range.maxInterval)
  })

  it('uses the current time when no seed is supplied', () => {
    const dateNow = vi.spyOn(Date, 'now').mockReturnValue(42)

    expect(withFuzzing(10, 5, config)).toBe(withFuzzing(10, 5, config, '42'))
    dateNow.mockRestore()
  })

  it('creates interval ranges from custom fuzz ranges', () => {
    const range = getFuzzRange(30, 9, 365, [])

    expect(range).toEqual({ minInterval: 29, maxInterval: 31 })
  })

  it('uses FNV-1a with Mulberry32 as the default seeded rng', () => {
    expect(fnv1aMulberry32Rng('string-card-1')()).toBe(0.643895001616329)
  })

  it('caps the fuzz range at maximumInterval', () => {
    const range = getFuzzRange(737, 98, 365)
    const interval = withFuzzing(
      737,
      98,
      { enableFuzz: true, maximumInterval: 365 },
      'seed'
    )

    expect(range.maxInterval).toBe(365)
    expect(interval).toBeGreaterThanOrEqual(range.minInterval)
    expect(interval).toBeLessThanOrEqual(range.maxInterval)
  })

  it('keeps the elapsed-days lower bound only when needed', () => {
    const range = getFuzzRange(5, 5, 100)

    expect(range.minInterval).toBeLessThanOrEqual(range.maxInterval)
  })
})
