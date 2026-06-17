// Timezone utility functions for FSRS training

// Cache for DateTimeFormat instances to improve performance
const formatterCache = new Map<string, Intl.DateTimeFormat>()

/**
 * Get or create a cached DateTimeFormat instance for a timezone
 * @param tz - Timezone string
 * @returns Cached or new DateTimeFormat instance
 */
export function getFormatter(tz: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(tz)

  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    formatterCache.set(tz, formatter)
  }

  return formatter
}

/**
 * Get all supported timezones
 * @returns Array of timezone strings
 */
export const getSupportedTimezones = Intl.supportedValuesOf('timeZone')
