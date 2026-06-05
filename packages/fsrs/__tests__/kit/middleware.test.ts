import { compose, type Middleware } from 'ts-fsrs/kit'

interface Context {
  trace: string[]
}

describe('kit/middleware compose', () => {
  it('runs middleware in onion order and returns the handler result', () => {
    const a: Middleware<Context, number> = (ctx, next) => {
      ctx.trace.push('a:in')
      const r = next()
      ctx.trace.push('a:out')
      return r
    }
    const b: Middleware<Context, number> = (ctx, next) => {
      ctx.trace.push('b:in')
      const r = next()
      ctx.trace.push('b:out')
      return r
    }
    const run = compose<Context, number>([a, b], (ctx) => {
      ctx.trace.push('handler')
      return 42
    })

    const ctx: Context = { trace: [] }
    expect(run(ctx)).toBe(42)
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

  it('throws when next() is called multiple times', () => {
    const bad: Middleware<Context, number> = (_ctx, next) => {
      next()
      return next()
    }
    const run = compose<Context, number>([bad], () => 0)
    expect(() => run({ trace: [] })).toThrow('next() called multiple times')
  })

  it('shares the same context across the chain', () => {
    interface Counter {
      value: number
    }
    const inc: Middleware<Counter, number> = (ctx, next) => {
      ctx.value += 1
      return next()
    }
    const run = compose<Counter, number>([inc, inc, inc], (ctx) => ctx.value)
    expect(run({ value: 0 })).toBe(3)
  })
})
