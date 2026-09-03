/**
 * Worker transcripts mix `console.log(JSON.stringify(...))` output with plain
 * text and stack traces. Only structured values are worth handing to a JSON
 * viewer; scalars read better as the text the example actually printed.
 */
export function parseLogJson(text: string): object | undefined {
  const trimmed = text.trim()
  // Cheap gate first: JSON.parse on a long stack trace is wasted work.
  if (!/^[[{]/.test(trimmed)) return undefined
  try {
    const value: unknown = JSON.parse(trimmed)
    return typeof value === 'object' && value !== null
      ? (value as object)
      : undefined
  } catch {
    return undefined
  }
}
