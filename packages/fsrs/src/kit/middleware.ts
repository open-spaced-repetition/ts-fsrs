/**
 * A middleware operating on a shared context `T` and producing a result `R`.
 *
 * Follows the onion model: call `next()` to obtain the downstream result, then
 * return it (optionally transformed). Returning without calling `next()`
 * short-circuits the remaining middleware.
 */
export type Middleware<T, R> = (ctx: T, next: () => R) => R

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
