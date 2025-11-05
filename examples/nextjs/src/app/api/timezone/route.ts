import { NextResponse } from 'next/server'
import { getFormatter, getSupportedTimezones } from '@/utils/timezone'

export const dynamic = 'force-static'
/**
 * Get timezone display label with offset
 * @param tz - Timezone string
 * @returns Formatted label
 */
function getTimezoneLabel(tz: string): string {
  try {
    const now = Date.now()
    const formatter = getFormatter(tz)
    const parts = formatter.formatToParts(new Date(now))
    const offsetPart = parts.find((p) => p.type === 'timeZoneName')

    if (offsetPart?.value) {
      return `${tz} (${offsetPart.value})`
    }

    return tz
  } catch (error) {
    throw new Error(
      `Failed to get timezone label for: ${tz}. ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Get curated list of common timezones with labels
 */
function getCommonTimezones() {
  // Get all supported timezones
  const allTimezones = getSupportedTimezones

  // Sort by region and then by name
  const sortedTimezones = allTimezones.sort((a, b) => {
    const regionA = a.split('/')[0]
    const regionB = b.split('/')[0]

    if (regionA !== regionB) {
      // Special handling for UTC/GMT to be first
      if (regionA === 'UTC' || regionA === 'GMT') return -1
      if (regionB === 'UTC' || regionB === 'GMT') return 1
      return regionA.localeCompare(regionB)
    }

    return a.localeCompare(b)
  })

  // Map to objects with value and label
  return sortedTimezones.map((tz) => ({
    value: tz,
    label: getTimezoneLabel(tz),
  }))
}

export async function GET() {
  const timezones = getCommonTimezones()
  return NextResponse.json(timezones)
}
