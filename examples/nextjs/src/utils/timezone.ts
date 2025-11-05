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
 * Get timezone offset in milliseconds for a given timezone at a specific time
 * Uses Intl.DateTimeFormat to accurately calculate timezone offset including DST
 *
 * @param ms - The timestamp in milliseconds
 * @param tz - The timezone string (e.g., 'Asia/Shanghai', 'America/New_York')
 * @returns The timezone offset in milliseconds
 */
export const getTimezoneOffset = (ms: number, tz: string): number => {
  try {
    // Create a date object from the timestamp
    const date = new Date(ms)

    // Get UTC time parts
    const utcYear = date.getUTCFullYear()
    const utcMonth = date.getUTCMonth()
    const utcDay = date.getUTCDate()
    const utcHours = date.getUTCHours()
    const utcMinutes = date.getUTCMinutes()
    const utcSeconds = date.getUTCSeconds()

    // Get cached formatter for the target timezone
    const formatter = getFormatter(tz)

    // Format the date in the target timezone
    const parts = formatter.formatToParts(date)
    const tzYear = parseInt(
      parts.find((p) => p.type === 'year')?.value || '0',
      10
    )
    const tzMonth =
      parseInt(parts.find((p) => p.type === 'month')?.value || '0', 10) - 1
    const tzDay = parseInt(
      parts.find((p) => p.type === 'day')?.value || '0',
      10
    )
    const tzHours = parseInt(
      parts.find((p) => p.type === 'hour')?.value || '0',
      10
    )
    const tzMinutes = parseInt(
      parts.find((p) => p.type === 'minute')?.value || '0',
      10
    )
    const tzSeconds = parseInt(
      parts.find((p) => p.type === 'second')?.value || '0',
      10
    )

    // Calculate the difference in milliseconds
    const utcTime = Date.UTC(
      utcYear,
      utcMonth,
      utcDay,
      utcHours,
      utcMinutes,
      utcSeconds
    )
    const tzTime = Date.UTC(
      tzYear,
      tzMonth,
      tzDay,
      tzHours,
      tzMinutes,
      tzSeconds
    )

    // The offset is the difference between local time and UTC
    return tzTime - utcTime
  } catch (error) {
    // Fallback: try to parse timezone offset from string like "UTC+8" or "GMT-5"
    const utcMatch = tz.match(/^(?:UTC|GMT)([+-]\d+)$/i)
    if (utcMatch) {
      const hours = parseInt(utcMatch[1], 10)
      return hours * 60 * 60 * 1000
    }

    // Throw error if timezone is invalid
    throw new Error(
      `Failed to calculate timezone offset for: ${tz}. ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Get all supported timezones
 * @returns Array of timezone strings
 */
export const getSupportedTimezones = Intl.supportedValuesOf('timeZone')
