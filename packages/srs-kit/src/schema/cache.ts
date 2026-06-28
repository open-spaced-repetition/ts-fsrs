const undefinedCacheValue = Symbol('srs-kit.cache.undefined')

const defaultCacheSize = 200

export type CacheOptions = {
  readonly lru?: boolean
  readonly size?: number
}

type Cache<Key, Value> = {
  get(key: Key): Value | undefined
  set(key: Key, value: Value): void
}

class LRUMap<Key, Value> {
  private readonly limit: number
  private readonly values = new Map<Key, Value>()

  constructor(options: { readonly size: number }) {
    if (!Number.isInteger(options.size) || options.size < 1) {
      throw new RangeError('LRUMap size must be a positive integer')
    }

    this.limit = options.size
  }

  get(key: Key): Value | undefined {
    if (!this.values.has(key)) {
      return undefined
    }

    const value = this.values.get(key) as Value
    this.values.delete(key)
    this.values.set(key, value)
    return value
  }

  set(key: Key, value: Value): void {
    if (this.values.has(key)) {
      this.values.delete(key)
    }

    this.values.set(key, value)

    if (this.values.size > this.limit) {
      const oldestKey = this.values.keys().next().value as Key
      this.values.delete(oldestKey)
    }
  }
}

export function withCache<const Key, Value>(
  getValue: (key: Key) => Value,
  options: CacheOptions = {}
): (key: Key) => Value {
  const cache: Cache<Key, Value | typeof undefinedCacheValue> =
    options.lru === false
      ? new Map<Key, Value | typeof undefinedCacheValue>()
      : new LRUMap<Key, Value | typeof undefinedCacheValue>({
          size: options.size ?? defaultCacheSize,
        })

  return (key) => {
    const cached = cache.get(key)
    if (cached !== undefined) {
      return (cached === undefinedCacheValue ? undefined : cached) as Value
    }

    const value = getValue(key)
    // Map#get returns undefined for misses, so store an internal sentinel
    // when the computed value itself is undefined.
    cache.set(key, value === undefined ? undefinedCacheValue : value)
    return value
  }
}
