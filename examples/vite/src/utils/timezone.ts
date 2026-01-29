/**
 * Get timezone offset in minutes for a given timestamp
 * Uses new Date() to get the local system offset
 *
 * @param ms - The timestamp in milliseconds
 * @returns The timezone offset in minutes
 */
export const getTimezoneOffset = (ms: number): number => {
  // new Date().getTimezoneOffset() returns the difference in minutes between UTC and local time.
  // Positive values are west of UTC, negative values are east of UTC.
  // e.g., UTC+8 returns -480.
  // We negate it to match the expected format (positive for East of UTC).
  return -new Date(ms).getTimezoneOffset()
}
