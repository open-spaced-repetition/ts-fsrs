import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  assert,
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

    assignObjectFields(target, { source: 'test', count: 1 })

    expect(target).toEqual({ source: 'test', count: 1 })
  })

  it('skips inherited fields', () => {
    const target: Record<PropertyKey, unknown> = {}
    const source = Object.create({ inherited: 'skip' }) as { own?: string }
    source.own = 'keep'

    assignObjectFields(target, source)

    expect(target).toEqual({ own: 'keep' })
  })
})
