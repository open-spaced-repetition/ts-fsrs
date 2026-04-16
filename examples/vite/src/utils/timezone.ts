/**
 * Get timezone offset in minutes for a given timestamp.
 * Uses the local system offset (the timezone argument is accepted to match
 * the binding's `(ms, timezone) => number` signature but is ignored here).
 *
 * @param ms - The timestamp in milliseconds
 * @param _timezone - The IANA timezone identifier (unused; kept for signature parity)
 * @returns The timezone offset in minutes, positive east of UTC
 */
export const getTimezoneOffset = (ms: number, _timezone: string): number => {
  // new Date().getTimezoneOffset() returns the difference in minutes between UTC and local time.
  // Positive values are west of UTC, negative values are east of UTC.
  // e.g., UTC+8 returns -480.
  // We negate it to match the expected format (positive for East of UTC).
  return -new Date(ms).getTimezoneOffset()
}
