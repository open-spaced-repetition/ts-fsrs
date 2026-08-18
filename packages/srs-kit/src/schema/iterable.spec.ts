import { describe, expect, expectTypeOf, it } from 'vitest'
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

  it('allows undefined as a key', () => {
    const calls: unknown[] = []
    const iterable = createLazyIterable([undefined, 'next'] as const, (key) => {
      calls.push(key)
      return key ?? 'missing'
    })

    expect(Array.from(iterable)).toEqual(['missing', 'next'])
    expect(calls).toEqual([undefined, 'next'])
  })

  it('maps values to an array and supports chaining', () => {
    const sourceCalls: number[] = []
    const mapCalls: number[] = []
    const mapped = createLazyIterable([1, 2, 3], (key) => {
      sourceCalls.push(key)
      return key * 2
    })
      .map((value) => {
        mapCalls.push(value)
        return value + 1
      })
      .map(String)

    expectTypeOf(mapped).toEqualTypeOf<string[]>()
    expect(mapped).toEqual(['3', '5', '7'])
    expect(sourceCalls).toEqual([1, 2, 3])
    expect(mapCalls).toEqual([2, 4, 6])
  })
})
