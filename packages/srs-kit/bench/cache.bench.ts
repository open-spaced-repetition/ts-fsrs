import { bench, describe } from 'vitest'
import { withCache } from '@/schema/index.js'

let cacheSink = 0

function consume(value: number): void {
  cacheSink = (cacheSink + value) % Number.MAX_SAFE_INTEGER
}

function withUndefinedCache<const Key, Value>(
  getValue: (key: Key) => Value
): (key: Key) => Value {
  const cache = new Map<Key, Value>()

  return (key) => {
    const cached = cache.get(key)
    // This faster path only works when getValue never returns undefined.
    // withCache keeps Map.has() so undefined values can still be cached safely.
    if (cached !== undefined) {
      return cached
    }

    const value = getValue(key)
    cache.set(key, value)
    return value
  }
}

function withHasCache<const Key, Value>(
  getValue: (key: Key) => Value
): (key: Key) => Value {
  const cache = new Map<Key, Value>()

  return (key) => {
    if (cache.has(key)) {
      return cache.get(key) as Value
    }

    const value = getValue(key)
    cache.set(key, value)
    return value
  }
}

describe('withCache', () => {
  const keys = [1, 2, 3, 4] as const

  describe('cache hit', () => {
    const hasCache = withHasCache((key: number) => key * 2)
    const sentinelCache = withCache((key: number) => key * 2)
    const undefinedCache = withUndefinedCache((key: number) => key * 2)
    hasCache(1)
    sentinelCache(1)
    undefinedCache(1)

    bench('Map.has + get', () => {
      consume(hasCache(1))
    })

    bench('get !== undefined + sentinel', () => {
      consume(sentinelCache(1))
    })

    bench('get !== undefined', () => {
      consume(undefinedCache(1))
    })
  })

  describe('cache miss', () => {
    const hasCache = withHasCache((key: number) => key * 2)
    const sentinelCache = withCache((key: number) => key * 2)
    const undefinedCache = withUndefinedCache((key: number) => key * 2)
    let key = 0

    bench('Map.has + get', () => {
      key += 1
      consume(hasCache(key))
    })

    bench('get !== undefined + sentinel', () => {
      key += 1
      consume(sentinelCache(key))
    })

    bench('get !== undefined', () => {
      key += 1
      consume(undefinedCache(key))
    })
  })

  describe('4-key cycle', () => {
    const hasCache = withHasCache((key: number) => key * 2)
    const sentinelCache = withCache((key: number) => key * 2)
    const undefinedCache = withUndefinedCache((key: number) => key * 2)
    for (const key of keys) {
      hasCache(key)
      sentinelCache(key)
      undefinedCache(key)
    }
    let index = 0

    bench('Map.has + get', () => {
      const key = keys[index & 3]
      index += 1
      consume(hasCache(key))
    })

    bench('get !== undefined + sentinel', () => {
      const key = keys[index & 3]
      index += 1
      consume(sentinelCache(key))
    })

    bench('get !== undefined', () => {
      const key = keys[index & 3]
      index += 1
      consume(undefinedCache(key))
    })
  })
})
