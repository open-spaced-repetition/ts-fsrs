export interface LazyIterable<Value> extends Iterable<Value> {
  map<MappedValue>(callback: (value: Value) => MappedValue): MappedValue[]
  [Symbol.iterator](): IterableIterator<Value>
}

export function createLazyIterable<const Key, Value>(
  keys: readonly Key[],
  getValue: (key: Key) => Value
): LazyIterable<Value> {
  return {
    map(callback) {
      return Array.from(this, (value) => callback(value))
    },
    [Symbol.iterator]() {
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
  }
}
