/**
 * A middleware operating on a shared context `T` and producing a result `R`.
 *
 * Follows the onion model: call `next()` to obtain the downstream result, then
 * return it (optionally transformed). Returning without calling `next()`
 * short-circuits the remaining middleware.
 */
export type Middleware<T = unknown, R = unknown> = (ctx: T, next: () => R) => R

/**
 * Composes middleware around a terminal `handler`, running them in registration
 * order against the same context (onion model). Returns the result bubbled back
 * up through the chain.
 */
export function compose<T, R>(
  middlewares: Middleware<T, R>[],
  handler: (ctx: T) => R
): (ctx: T) => R {
  return (ctx) => {
    let index = -1
    const dispatch = (i: number): R => {
      if (i <= index) {
        throw new Error('next() called multiple times')
      }
      index = i
      if (i === middlewares.length) {
        return handler(ctx)
      }
      return middlewares[i](ctx, () => dispatch(i + 1))
    }
    return dispatch(0)
  }
}

/**
 * Reinterpret a middleware as one operating on a wider context/result. The
 * input must be a middleware (so non-middleware values are rejected), while the
 * returned `T`/`R` are inferred from the call site — defaulting to the input's
 * own types when no wider context is expected. The reinterpretation itself is
 * unchecked: callers are responsible for the runtime context being compatible.
 */
export function defineMiddleware<In, Out, T = In, R = Out>(
  middleware: Middleware<In, Out>
): Middleware<T, R> {
  return middleware as unknown as Middleware<T, R>
}
