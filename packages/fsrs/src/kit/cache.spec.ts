import { describe, expect, it } from 'vitest'
import { createCachedProxy, LRUMap, withCache } from './cache.js'

describe('LRUMap', () => {
  it('evicts the least recently used entry', () => {
    const cache = new LRUMap<string, number>(2)

    cache.set('a', 1)
    cache.set('b', 2)
    expect(cache.get('a')).toBe(1)
    cache.set('c', 3)

    expect(cache.has('a')).toBe(true)
    expect(cache.has('b')).toBe(false)
    expect(cache.has('c')).toBe(true)
  })

  it('keeps the newest value when an existing key is overwritten', () => {
    const cache = new LRUMap<string, number>(2)

    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('a', 3)
    cache.set('c', 4)

    expect(cache.has('a')).toBe(true)
    expect(cache.peek('a')).toBe(3)
    expect(cache.has('b')).toBe(false)
  })
})

describe('createCachedProxy', () => {
  it('returns the same function wrapper for repeated method reads', () => {
    const model = {
      value() {
        return 1
      },
    }
    const cached = createCachedProxy(model)

    expect(cached.value).toBe(cached.value)
  })

  it('passes through method calls outside a cache scope', () => {
    let calls = 0
    const model = {
      calculate(value: number) {
        calls += 1
        return value * 2
      },
    }
    const cached = createCachedProxy(model)

    expect(cached.calculate(3)).toBe(6)
    expect(cached.calculate(3)).toBe(6)
    expect(calls).toBe(2)
  })

  it('caches method results by argument value inside a cache scope', () => {
    let calls = 0
    const model = {
      scale: 2,
      calculate(input: { value: number }) {
        calls += 1
        return {
          result: input.value * this.scale,
        }
      },
    }
    const cached = createCachedProxy(model)

    const [first, second] = withCache(() => [
      cached.calculate({ value: 3 }),
      cached.calculate({ value: 3 }),
    ])

    expect(first).toBe(second)
    expect(first).toEqual({ result: 6 })
    expect(calls).toBe(1)
  })

  it('keeps distinct cached results for distinct arguments', () => {
    let calls = 0
    const model = {
      calculate(value: number) {
        calls += 1
        return value * 2
      },
    }
    const cached = createCachedProxy(model)

    withCache(() => {
      expect(cached.calculate(2)).toBe(4)
      expect(cached.calculate(3)).toBe(6)
      expect(cached.calculate(2)).toBe(4)
    })
    expect(calls).toBe(2)
  })

  it('evicts old method results with the per-method LRU', () => {
    let calls = 0
    const model = {
      calculate(value: number) {
        calls += 1
        return value * 2
      },
    }
    const cached = createCachedProxy(model)

    withCache(() => {
      for (let value = 0; value < 17; value++) {
        cached.calculate(value)
      }
      cached.calculate(0)
    })

    expect(calls).toBe(18)
  })

  it('passes through non-function properties', () => {
    const config = { desiredRetention: 0.9 }
    const cached = createCachedProxy({
      config,
      calculate() {
        return 1
      },
    })

    expect(cached.config).toBe(config)
  })
})
