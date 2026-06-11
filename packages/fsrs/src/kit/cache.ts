export class LRUMap<K, V> implements Iterable<[K, V]> {
  private readonly map = new Map<K, V>()
  private maxSizeValue: number

  constructor(maxSize: number = 16) {
    this.maxSizeValue = Math.max(1, Number(maxSize) || 0)
  }

  get size(): number {
    return this.map.size
  }

  get maxSize(): number {
    return this.maxSizeValue
  }

  set maxSize(value: number) {
    this.resize(value)
  }

  get(key: K): V | undefined {
    if (!this.map.has(key)) {
      return undefined
    }

    const value = this.map.get(key) as V
    this.touch(key, value)
    return value
  }

  peek(key: K): V | undefined {
    return this.map.get(key)
  }

  has(key: K): boolean {
    return this.map.has(key)
  }

  set(key: K, value: V): this {
    if (this.map.has(key)) {
      this.map.delete(key)
    }

    this.map.set(key, value)
    this.evictIfNeeded()
    return this
  }

  delete(key: K): boolean {
    return this.map.delete(key)
  }

  clear(): void {
    this.map.clear()
  }

  resize(maxSize: number): this {
    this.maxSizeValue = maxSize
    this.evictIfNeeded()
    return this
  }

  keys(): IterableIterator<K> {
    return this.map.keys()
  }

  values(): IterableIterator<V> {
    return this.map.values()
  }

  entries(): IterableIterator<[K, V]> {
    return this.map.entries()
  }

  forEach(callback: (value: V, key: K, map: this) => void): void {
    for (const [key, value] of this.map) {
      callback(value, key, this)
    }
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.entries()
  }

  private touch(key: K, value: V): void {
    this.map.delete(key)
    this.map.set(key, value)
  }

  private evictIfNeeded(): void {
    while (this.map.size > this.maxSizeValue) {
      const oldest = this.map.keys().next()
      if (oldest.done) {
        return
      }

      this.map.delete(oldest.value)
    }
  }
}

export function createCachedProxy<T extends object>(model: T): T {
  const functionCache = new Map<PropertyKey, unknown>()

  const proxy = new Proxy(model, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver)

      if (typeof value !== 'function') {
        return value
      }

      const cached = functionCache.get(property)

      if (cached) {
        return cached
      }

      const resultCache = new LRUMap<unknown, unknown>(16)

      const wrapped = (...args: unknown[]) => {
        const cacheKey = JSON.stringify(args)

        if (resultCache.has(cacheKey)) {
          return resultCache.get(cacheKey)
        }

        const result = Reflect.apply(value, target, args)

        resultCache.set(cacheKey, result)

        return result
      }

      functionCache.set(property, wrapped)

      return wrapped
    },
  }) as T

  return proxy
}
