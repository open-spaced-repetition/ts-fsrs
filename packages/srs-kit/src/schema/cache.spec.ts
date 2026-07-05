import { describe, expect, it } from 'vitest'
import { withCache } from './cache.js'

describe('withCache', () => {
  it('computes each key once', () => {
    const calls: number[] = []
    const cached = withCache((key: number) => {
      calls.push(key)
      return { value: key * 2 }
    })

    expect(cached(1)).toBe(cached(1))
    expect(cached(2)).toEqual({ value: 4 })
    expect(cached(1)).toEqual({ value: 2 })
    expect(calls).toEqual([1, 2])
  })

  it('caches undefined values', () => {
    let calls = 0
    const cached = withCache((_key: string): undefined => {
      calls += 1
      return undefined
    })

    expect(cached('missing')).toBeUndefined()
    expect(cached('missing')).toBeUndefined()
    expect(calls).toBe(1)
  })

  it('preserves null values', () => {
    let calls = 0
    const cached = withCache((_key: string): null => {
      calls += 1
      return null
    })

    expect(cached('empty')).toBeNull()
    expect(cached('empty')).toBeNull()
    expect(calls).toBe(1)
  })

  it('evicts the least recently used key when the cache is full', () => {
    const calls: number[] = []
    const cached = withCache(
      (key: number) => {
        calls.push(key)
        return key * 2
      },
      { size: 2 }
    )

    expect(cached(1)).toBe(2)
    expect(cached(2)).toBe(4)
    expect(cached(1)).toBe(2)
    expect(cached(3)).toBe(6)
    expect(cached(2)).toBe(4)
    expect(calls).toEqual([1, 2, 3, 2])
  })

  it('keeps existing entries when LRU is disabled', () => {
    const calls: number[] = []
    const cached = withCache(
      (key: number) => {
        calls.push(key)
        return key * 2
      },
      { lru: false, size: 1 }
    )

    expect(cached(1)).toBe(2)
    expect(cached(2)).toBe(4)
    expect(cached(1)).toBe(2)
    expect(calls).toEqual([1, 2])
  })

  it('rejects invalid cache sizes', () => {
    expect(() => withCache((key: number) => key, { size: 0 })).toThrow(
      RangeError
    )
  })
})
