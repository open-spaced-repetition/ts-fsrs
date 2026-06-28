import { describe, expect, it } from 'vitest'
import { createLazyIterable } from './iterable.js'

describe('createLazyIterable', () => {
  it('computes values lazily in key order', () => {
    const calls: number[] = []
    const iterable = createLazyIterable([1, 2, 3] as const, (key) => {
      calls.push(key)
      return key * 2
    })

    expect(calls).toEqual([])

    const iterator = iterable[Symbol.iterator]()
    expect(iterator.next()).toEqual({ value: 2, done: false })
    expect(calls).toEqual([1])
    expect(iterator.next()).toEqual({ value: 4, done: false })
    expect(iterator.next()).toEqual({ value: 6, done: false })
    expect(iterator.next()).toEqual({ value: undefined, done: true })
  })

  it('returns an iterable iterator', () => {
    const iterator = createLazyIterable(['a'] as const, (key) =>
      key.toUpperCase()
    )[Symbol.iterator]()

    expect(iterator[Symbol.iterator]()).toBe(iterator)
    expect(Array.from(iterator)).toEqual(['A'])
  })
})
