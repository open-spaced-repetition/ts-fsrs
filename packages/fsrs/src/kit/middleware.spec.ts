import { describe, expect, it } from 'vitest'
import { compose, type Middleware } from './middleware.js'

interface Context {
  trace: string[]
}

describe('kit/middleware compose', () => {
  it('runs default void middleware in onion order', () => {
    const a: Middleware<Context> = (ctx, next) => {
      ctx.trace.push('a:in')
      const result = next()
      expect(result).toBeUndefined()
      ctx.trace.push('a:out')
    }
    const b: Middleware<Context> = (ctx, next) => {
      ctx.trace.push('b:in')
      next()
      ctx.trace.push('b:out')
    }
    const run = compose<Context, void>([a, b], (ctx) => {
      ctx.trace.push('handler')
    })

    const ctx: Context = { trace: [] }
    expect(run(ctx)).toBeUndefined()
    expect(ctx.trace).toEqual(['a:in', 'b:in', 'handler', 'b:out', 'a:out'])
  })

  it('returns the handler result when there is no middleware', () => {
    const run = compose<Context, string>([], () => 'done')
    expect(run({ trace: [] })).toBe('done')
  })

  it('lets middleware transform the downstream result', () => {
    const double: Middleware<Context, number> = (_ctx, next) => next() * 2
    const plusOne: Middleware<Context, number> = (_ctx, next) => next() + 1
    // handler -> 10, plusOne -> 11, double -> 22
    const run = compose<Context, number>([double, plusOne], () => 10)
    expect(run({ trace: [] })).toBe(22)
  })

  it('short-circuits when a middleware skips next()', () => {
    const order: string[] = []
    const guard: Middleware<Context, string> = () => 'short'
    const downstream: Middleware<Context, string> = (_ctx, next) => {
      order.push('downstream')
      return next()
    }
    const run = compose<Context, string>([guard, downstream], (ctx) => {
      ctx.trace.push('handler')
      return 'handler'
    })

    const ctx: Context = { trace: [] }
    expect(run(ctx)).toBe('short')
    expect(order).toEqual([])
    expect(ctx.trace).toEqual([])
  })

  it('throws when next() is called multiple times with default void middleware', () => {
    const bad: Middleware<Context> = (_ctx, next) => {
      next()
      next()
    }
    const run = compose<Context, void>([bad], () => {})
    expect(() => run({ trace: [] })).toThrow('next() called multiple times')
  })

  it('shares the same context across default void middleware', () => {
    interface Counter {
      value: number
    }
    const inc: Middleware<Counter> = (ctx, next) => {
      ctx.value += 1
      next()
    }
    const counter = { value: 0 }
    const run = compose<Counter, void>([inc, inc, inc], () => {})

    run(counter)

    expect(counter.value).toBe(3)
  })
})
