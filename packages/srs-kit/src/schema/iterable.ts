export interface LazyIterable<Value> extends Iterable<Value> {
  [Symbol.iterator](): IterableIterator<Value>
}

export function createLazyIterable<const Key, Value>(
  keys: readonly Key[],
  getValue: (key: Key) => Value
): LazyIterable<Value> {
  const result = Object.create(null)
  Object.defineProperty(result, Symbol.iterator, {
    enumerable: false,
    value() {
      let index = 0
      const iterator: IterableIterator<Value> = {
        next() {
          if (index >= keys.length) {
            return { value: undefined, done: true }
          }

          return { value: getValue(keys[index++]), done: false }
        },
        [Symbol.iterator]() {
          return iterator
        },
      }
      return iterator
    },
  })

  return result as LazyIterable<Value>
}
