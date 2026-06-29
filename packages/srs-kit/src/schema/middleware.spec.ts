import { describe, expect, it } from 'vitest'
import {
  composeMiddleware,
  type MiddlewareRuntimeHandler,
} from './middleware.js'

type Runtime = {
  readonly name: string
  readonly enabled: boolean
}

type ComposeContext = {
  readonly value: string
}

const composeContext: ComposeContext = { value: 'ctx' }

describe('composeMiddleware', () => {
  it('returns the terminal result without runtimes', () => {
    expect(composeMiddleware([], composeContext, (_ctx) => 'terminal')).toBe(
      'terminal'
    )
  })

  it('runs handlers in onion order and skips missing handlers', () => {
    const trace: string[] = []
    const runtimes: readonly Runtime[] = [
      { name: 'outer', enabled: true },
      { name: 'skipped', enabled: false },
      { name: 'inner', enabled: true },
    ]
    const createHandler =
      (runtime: Runtime): MiddlewareRuntimeHandler<string, ComposeContext> =>
      (ctx, next) => {
        trace.push(`${runtime.name}:before:${ctx.value}`)
        const nextResult = next()
        trace.push(`${runtime.name}:after:${ctx.value}`)
        return `${runtime.name}(${nextResult})`
      }
    const handlers = runtimes.map((runtime) =>
      runtime.enabled ? createHandler(runtime) : undefined
    )

    const result = composeMiddleware(handlers, composeContext, (_ctx) => {
      trace.push('terminal')
      return 'done'
    })

    expect(result).toBe('outer(inner(done))')
    expect(trace).toEqual([
      'outer:before:ctx',
      'inner:before:ctx',
      'terminal',
      'inner:after:ctx',
      'outer:after:ctx',
    ])
  })

  it('throws when next is called more than once', () => {
    expect(() =>
      composeMiddleware(
        [
          (_ctx: Runtime, next: () => string) => {
            next()
            return next()
          },
        ],
        { name: 'bad', enabled: true },
        (_ctx) => 'done'
      )
    ).toThrow('Middleware next() called multiple times')
  })
})
