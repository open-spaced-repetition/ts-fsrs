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

const PROXIED_SYMBOL = Symbol('proxied')

let activeCacheScope: object | undefined

export function withCache<T>(callback: () => T): T {
  const previousScope = activeCacheScope
  activeCacheScope = {}
  try {
    return callback()
  } finally {
    activeCacheScope = previousScope
  }
}

export function createCachedProxy<T extends object>(model: T): T {
  const functionCache = new Map<PropertyKey, unknown>()
  const objectIds = new WeakMap<object, number>()
  let nextObjectId = 1

  const proxy = new Proxy(model, {
    get(target, property, receiver) {
      if (property === PROXIED_SYMBOL) {
        return true
      }

      const value = Reflect.get(target, property, receiver)

      if (typeof value !== 'function') {
        return value
      }

      const cached = functionCache.get(property)

      if (cached) {
        return cached
      }

      const scopeCaches = new WeakMap<object, LRUMap<unknown, unknown>>()

      const wrapped = (...args: unknown[]) => {
        const scope = activeCacheScope
        if (!scope) {
          return Reflect.apply(value, target, args)
        }

        let resultCache = scopeCaches.get(scope)
        if (!resultCache) {
          resultCache = new LRUMap<unknown, unknown>(16)
          scopeCaches.set(scope, resultCache)
        }

        const cacheKey = createCacheKey(args, objectIds, () => nextObjectId++)

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

function createCacheKey(
  args: readonly unknown[],
  objectIds: WeakMap<object, number>,
  createObjectId: () => number
): string {
  let key = `${args.length}`

  for (let i = 0; i < args.length; i++) {
    key += `|${encodeValue(args[i], objectIds, createObjectId)}`
  }

  return key
}

function encodeValue(
  value: unknown,
  objectIds: WeakMap<object, number>,
  createObjectId: () => number
): string {
  switch (typeof value) {
    case 'undefined':
      return 'u'
    case 'string':
      return `s:${value}`
    case 'number':
      return `n:${value}`
    case 'boolean':
      return value ? 't' : 'f'
    case 'bigint':
      return `b:${value.toString()}`
    case 'symbol':
      return `y:${String(value)}`
    case 'function':
      return `r:${getObjectId(value, objectIds, createObjectId)}`
    case 'object':
      if (value === null) return 'null'
      return encodeObject(value, objectIds, createObjectId)
  }

  return '?'
}

function encodeObject(
  value: object,
  objectIds: WeakMap<object, number>,
  createObjectId: () => number
): string {
  if (Object.getPrototypeOf(value) !== Object.prototype) {
    return `r:${getObjectId(value, objectIds, createObjectId)}`
  }

  const record = value as Record<string, unknown>
  if (
    'memoryState' in record &&
    'rating' in record &&
    'elapsedDays' in record
  ) {
    return `o|memoryState:${encodeNestedValue(
      record.memoryState,
      objectIds,
      createObjectId
    )}|rating:${encodeValue(
      record.rating,
      objectIds,
      createObjectId
    )}|elapsedDays:${encodeValue(
      record.elapsedDays,
      objectIds,
      createObjectId
    )}|retrievability:${encodeValue(
      record.retrievability,
      objectIds,
      createObjectId
    )}`
  }

  const keys = Object.keys(record)
  let key = 'o'

  for (let i = 0; i < keys.length; i++) {
    const property = keys[i]
    const propertyValue = record[property]
    key += `|${property}:${encodeNestedValue(
      propertyValue,
      objectIds,
      createObjectId
    )}`
  }

  return key
}

function encodeNestedValue(
  value: unknown,
  objectIds: WeakMap<object, number>,
  createObjectId: () => number
): string {
  if (
    value === null ||
    (typeof value !== 'object' && typeof value !== 'function')
  ) {
    return encodeValue(value, objectIds, createObjectId)
  }

  return `r:${getObjectId(value, objectIds, createObjectId)}`
}

function getObjectId(
  value: object,
  objectIds: WeakMap<object, number>,
  createObjectId: () => number
): number {
  const id = objectIds.get(value)
  if (id) {
    return id
  }

  const nextId = createObjectId()
  objectIds.set(value, nextId)
  return nextId
}
