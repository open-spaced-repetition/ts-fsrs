import { describe, expect, it } from 'vitest'
import { type MiddlewareRuntimeHandler, runMiddlewares } from './middleware.js'

type Runtime = {
  readonly name: string
  readonly enabled: boolean
}

type RuntimeContext = {
  readonly value: string
}

const runtimeContext: RuntimeContext = { value: 'ctx' }

describe('runMiddlewares', () => {
  it('runs the terminal without runtimes', () => {
    const trace: string[] = []

    runMiddlewares([], runtimeContext, (_ctx) => {
      trace.push('terminal')
    })

    expect(trace).toEqual(['terminal'])
  })

  it('runs handlers in onion order and skips missing handlers', () => {
    const trace: string[] = []
    const runtimes: readonly Runtime[] = [
      { name: 'outer', enabled: true },
      { name: 'skipped', enabled: false },
      { name: 'inner', enabled: true },
    ]
    const createHandler =
      (runtime: Runtime): MiddlewareRuntimeHandler<RuntimeContext> =>
      (ctx, next) => {
        trace.push(`${runtime.name}:before:${ctx.value}`)
        next()
        trace.push(`${runtime.name}:after:${ctx.value}`)
      }
    const handlers = runtimes.map((runtime) =>
      runtime.enabled ? createHandler(runtime) : undefined
    )

    runMiddlewares(handlers, runtimeContext, (_ctx) => {
      trace.push('terminal')
    })

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
      runMiddlewares(
        [
          (_ctx: Runtime, next: () => void) => {
            next()
            next()
          },
        ],
        { name: 'bad', enabled: true },
        (_ctx) => {}
      )
    ).toThrow('Middleware next() called multiple times')
  })
})
