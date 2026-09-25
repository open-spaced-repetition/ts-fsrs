import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  assert,
  assignEnumerableDataFields,
  assignObjectFields,
  isFiniteNumber,
  isFunction,
  isObject,
  noop,
  run,
} from './utils.js'

describe('isObject', () => {
  it('returns true for plain objects', () => {
    expect(isObject({})).toBe(true)
    expect(isObject({ a: 1 })).toBe(true)
  })

  it('returns false for non-objects', () => {
    expect(isObject(null)).toBe(false)
    expect(isObject(undefined)).toBe(false)
    expect(isObject(42)).toBe(false)
    expect(isObject('str')).toBe(false)
    expect(isObject([1, 2])).toBe(false)
  })
})

describe('isFiniteNumber', () => {
  it('narrows finite numbers without coercing other values', () => {
    const finiteValues: unknown[] = [
      0,
      -1,
      1.5,
      Number.MIN_VALUE,
      Number.MAX_VALUE,
    ]
    for (const value of finiteValues) {
      expect(isFiniteNumber(value)).toBe(true)
      if (isFiniteNumber(value)) {
        expectTypeOf(value).toEqualTypeOf<number>()
      }
    }
    for (const value of [
      NaN,
      Infinity,
      -Infinity,
      undefined,
      null,
      '1',
      true,
      1n,
      {},
      [],
      Object(1),
    ]) {
      expect(isFiniteNumber(value)).toBe(false)
    }
  })
})

describe('isFunction', () => {
  it('returns true for functions', () => {
    expect(isFunction(() => {})).toBe(true)
    expect(isFunction(noop)).toBe(true)
  })

  it('returns false for non-functions', () => {
    expect(isFunction(42)).toBe(false)
    expect(isFunction(null)).toBe(false)
  })
})

describe('run', () => {
  it('executes and returns the result', () => {
    expect(run(() => 42)).toBe(42)
  })
})

describe('noop', () => {
  it('returns undefined', () => {
    expect(noop()).toBeUndefined()
  })
})

describe('assert', () => {
  it('does not throw when condition is true', () => {
    expect(() => assert(true)).not.toThrow()
  })

  it('throws when condition is false', () => {
    expect(() => assert(false)).toThrow('AssertionError: no additional info')
  })

  it('includes custom message', () => {
    expect(() => assert(false, 'custom')).toThrow('AssertionError: custom')
  })
})

describe('assignObjectFields', () => {
  it('assigns own enumerable fields', () => {
    const target: Record<PropertyKey, unknown> = {}
    const symbol = Symbol('ignored')

    assignObjectFields(target, { source: 'test', count: 1, [symbol]: true })

    expect(target).toEqual({ source: 'test', count: 1 })
    expect(target[symbol]).toBeUndefined()
  })

  it('skips inherited fields', () => {
    const target: Record<PropertyKey, unknown> = {}
    const source = Object.create({ inherited: 'skip' }) as { own?: string }
    source.own = 'keep'

    assignObjectFields(target, source)

    expect(target).toEqual({ own: 'keep' })
  })

  it('keeps an own __proto__ field without changing the target prototype', () => {
    const target: Record<PropertyKey, unknown> = {}
    const source = JSON.parse('{"__proto__":{"polluted":true}}')

    assignObjectFields(target, source)

    expect(Object.getPrototypeOf(target)).toBe(Object.prototype)
    expect(Object.hasOwn(target, '__proto__')).toBe(true)
    expect(target.polluted).toBeUndefined()
  })
})

describe('assignEnumerableDataFields', () => {
  it('replaces an own setter with a data property', () => {
    const target: Record<PropertyKey, unknown> = {}
    let setterCalls = 0
    Object.defineProperty(target, 'value', {
      set(_value: unknown) {
        setterCalls += 1
      },
      configurable: true,
    })

    assignEnumerableDataFields(target, { value: 1 })

    expect(setterCalls).toBe(0)
    expect(target.value).toBe(1)
  })

  it('does not invoke a setter trap on a custom prototype', () => {
    let setterCalls = 0
    const prototype = new Proxy(
      {},
      {
        has: () => false,
        set: () => {
          setterCalls += 1
          return true
        },
      }
    )
    const target = Object.create(prototype) as Record<PropertyKey, unknown>

    assignEnumerableDataFields(target, { value: 1 })

    expect(setterCalls).toBe(0)
    expect(Object.hasOwn(target, 'value')).toBe(true)
    expect(target.value).toBe(1)
  })

  it('keeps the enumerable data-property output for existing keys', () => {
    const target: Record<PropertyKey, unknown> = {}
    Object.defineProperty(target, 'value', {
      value: 0,
      writable: true,
      enumerable: false,
      configurable: true,
    })

    assignEnumerableDataFields(target, { value: 1 })

    expect(Object.getOwnPropertyDescriptor(target, 'value')).toMatchObject({
      value: 1,
      writable: true,
      enumerable: true,
      configurable: true,
    })
  })

  it('copies enumerable symbols and values without invoking target setters', () => {
    const symbol = Symbol('field')
    const source = JSON.parse('{"__proto__":{"polluted":true},"value":1}')
    Object.defineProperty(source, 'hidden', { value: 'skip' })
    source[symbol] = 'symbol'
    let setterCalls = 0
    const inherited = {
      set value(_value: unknown) {
        setterCalls += 1
      },
    }
    const target = Object.create(inherited) as Record<PropertyKey, unknown>

    expect(assignEnumerableDataFields(target, source, { value: 2 })).toBe(
      target
    )
    expect(Object.getPrototypeOf(target)).toBe(inherited)
    expect(Object.hasOwn(target, '__proto__')).toBe(true)
    expect(target.polluted).toBeUndefined()
    expect(target.value).toBe(2)
    expect(target[symbol]).toBe('symbol')
    expect(Object.hasOwn(target, 'hidden')).toBe(false)
    expect(setterCalls).toBe(0)
  })
})
