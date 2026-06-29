export type MiddlewareRuntimeHandler<Result, Context> = (
  ctx: Context,
  next: () => Result
) => Result

export function composeMiddleware<Result, Context>(
  handlers: readonly (MiddlewareRuntimeHandler<Result, Context> | undefined)[],
  context: Context,
  terminal: (ctx: Context) => Result
): Result {
  if (handlers.length === 0) {
    return terminal(context)
  }

  let index = -1
  const dispatch = (nextIndex: number): Result => {
    if (nextIndex <= index) {
      throw new Error('Middleware next() called multiple times')
    }
    index = nextIndex

    if (nextIndex >= handlers.length) {
      return terminal(context)
    }

    const handler = handlers[nextIndex]
    if (!handler) {
      return dispatch(nextIndex + 1)
    }

    return handler(context, () => dispatch(nextIndex + 1))
  }

  return dispatch(0)
}
