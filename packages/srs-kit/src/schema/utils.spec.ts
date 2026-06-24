import { describe, expect, it } from 'vitest'
import { assert, isFunction, isObject, noop, run } from './utils.js'

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
