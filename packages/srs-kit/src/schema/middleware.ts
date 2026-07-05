export type MiddlewareRuntimeHandler<Context> = (
  ctx: Context,
  next: () => void
) => void

export function composeMiddleware<Context>(
  handlers: readonly (MiddlewareRuntimeHandler<Context> | undefined)[],
  context: Context,
  terminal: (ctx: Context) => void
): void {
  if (handlers.length === 0) {
    terminal(context)
    return
  }

  let index = -1
  const dispatch = (nextIndex: number): void => {
    if (nextIndex <= index) {
      throw new Error('Middleware next() called multiple times')
    }
    index = nextIndex

    if (nextIndex >= handlers.length) {
      terminal(context)
      return
    }

    const handler = handlers[nextIndex]
    if (!handler) {
      dispatch(nextIndex + 1)
      return
    }

    handler(context, () => dispatch(nextIndex + 1))
  }

  dispatch(0)
}
