import * as fs from 'node:fs'
import {
  FSRSBindingItem,
  FSRSBindingReview,
} from '@open-spaced-repetition/binding/index.js'
import Papa from 'papaparse'

export interface CSVRecord {
  review_time: string
  card_id: string
  review_rating: string
  review_state: string
  review_duration: string
}

interface RevlogEntry {
  card_id: string
  review_time: number
  review_rating: number
  review_state: number
  review_duration: number
  last_interval: number
}

/**
 * Convert timestamp to date considering timezone and next_day_starts_at
 * Matches Rust implementation logic in convert.rs:20-42
 */
function convertToDate(
  timestamp: number,
  nextDayStartsAt: number,
  timezoneOffsetMinutes: number
): Date {
  const timestampSecs = Math.floor(timestamp / 1000)
  // Apply timezone offset and next_day_starts_at adjustment
  const adjustedMs =
    timestampSecs * 1000 +
    timezoneOffsetMinutes * 60 * 1000 -
    nextDayStartsAt * 60 * 60 * 1000

  return new Date(adjustedMs)
}

/**
 * Calculate difference in whole days between two dates
 */
function wholeDays(a: Date, b: Date): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24
  const utc1 = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate())
  const utc2 = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate())
  return Math.floor((utc2 - utc1) / MS_PER_DAY)
}

/**
 * Remove revlog before the last first learn
 * Matches Rust implementation logic in convert.rs:44-63
 */
function removeRevlogBeforeLastFirstLearn(
  entries: RevlogEntry[]
): RevlogEntry[] {
  const isLearningState = (entry: RevlogEntry): boolean =>
    entry.review_state === 0 || entry.review_state === 1

  let lastLearningBlockStart: number | null = null
  for (let i = entries.length - 1; i >= 0; i--) {
    if (isLearningState(entries[i])) {
      lastLearningBlockStart = i
    } else if (lastLearningBlockStart !== null) {
      break
    }
  }

  if (lastLearningBlockStart !== null) {
    return entries.slice(lastLearningBlockStart)
  }
  return []
}

/**
 * Convert revlog entries to FSRSBindingItems
 * Matches Rust implementation logic in convert.rs:65-116
 */
function convertToFsrsItemsInternal(
  entries: RevlogEntry[],
  nextDayStartsAt: number,
  timezone: string
): FSRSBindingItem[] {
  const filteredEntries = removeRevlogBeforeLastFirstLearn(entries)

  if (filteredEntries.length === 0) {
    return []
  }

  // Calculate last_interval for each entry (matches Rust logic at convert.rs:73-90)
  if (filteredEntries.length > 0) {
    let prevDate = convertToDate(
      filteredEntries[0].review_time,
      nextDayStartsAt,
      // if PDT, this will be -480 or -420
      getTimezoneOffset(timezone, filteredEntries[0].review_time)
    )

    for (let i = 1; i < filteredEntries.length; i++) {
      const currentDate = convertToDate(
        filteredEntries[i].review_time,
        nextDayStartsAt,
        getTimezoneOffset(timezone, filteredEntries[i].review_time)
      )
      filteredEntries[i].last_interval = wholeDays(prevDate, currentDate)
      prevDate = currentDate
    }
  }

  // Create FSRSBindingItem for each review (starting from 2nd)
  // Matches Rust logic at convert.rs:92-115
  const result: FSRSBindingItem[] = []

  for (let idx = 1; idx < filteredEntries.length; idx++) {
    const reviews: FSRSBindingReview[] = []
    let hasLongTermReview = false

    // Include all reviews from start to current index (inclusive)
    for (let i = 0; i <= idx; i++) {
      const entry = filteredEntries[i]
      const deltaT = Math.max(0, entry.last_interval)
      reviews.push(new FSRSBindingReview(entry.review_rating, deltaT))

      // Check if we have any long-term review (delta_t > 0)
      if (deltaT > 0) {
        hasLongTermReview = true
      }
    }

    // Filter: only keep items with long_term_review_cnt > 0
    if (hasLongTermReview) {
      const item = new FSRSBindingItem(reviews)
      result.push(item)
    }
  }

  return result
}

/**
 * Parse CSV file and convert to FSRSBindingItem array
 * Matches Rust implementation logic in convert.rs:118-154
 */
export function parseCSVToFSRSItems(
  csvPath: string,
  nextDayStartsAt: number = 4,
  timezone: string = 'Asia/Shanghai'
): FSRSBindingItem[] {
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const parsed = Papa.parse<CSVRecord>(csvContent, {
    header: true,
    skipEmptyLines: true,
  })

  if (parsed.errors.length > 0) {
    throw new Error(`CSV parsing errors: ${parsed.errors.join(', ')}`)
  }
  console.log(`Parsed ${parsed.data.length} records from CSV`)

  // Group by card_id
  const grouped: Record<string, RevlogEntry[]> = {}

  for (const record of parsed.data) {
    const entry: RevlogEntry = {
      card_id: record.card_id,
      review_time: Number.parseInt(record.review_time, 10),
      review_rating: Number.parseInt(record.review_rating, 10),
      review_state: Number.parseInt(record.review_state, 10),
      review_duration: Number.parseInt(record.review_duration, 10),
      last_interval: 0,
    }

    if (!grouped[entry.card_id]) {
      grouped[entry.card_id] = []
    }
    grouped[entry.card_id].push(entry)
  }

  // Sort entries by review_time for each card
  for (const entries of Object.values(grouped)) {
    if (entries.length > 1) {
      entries.sort((a, b) => a.review_time - b.review_time)
    }
  }

  // Convert each card's entries to FSRSBindingItems
  const result: FSRSBindingItem[] = []

  for (const entries of Object.values(grouped)) {
    const items = convertToFsrsItemsInternal(entries, nextDayStartsAt, timezone)
    result.push(...items)
  }

  return result
}

const tzMap = {} as Record<string, Intl.DateTimeFormat>

const timeZoneFunction = (timeZone: string) => {
  if (tzMap[timeZone]) return tzMap[timeZone]

  // very slow... so we cache it
  const tz = Intl.DateTimeFormat('ia', {
    timeZoneName: 'shortOffset',
    timeZone,
  })

  tzMap[timeZone] = tz
  return tz
}

export function getTimezoneOffset(
  timeZone: string,
  date: Date | number
): number {
  const timeZoneName = timeZoneFunction(timeZone)
    ?.formatToParts(date)
    ?.find((i) => i.type === 'timeZoneName')?.value
  if (!timeZoneName) return 0
  const offset = timeZoneName.slice(3)
  if (!offset) return 0

  const matchData = offset.match(/([+-])(\d+)(?::(\d+))?/)
  if (!matchData) throw new Error(`cannot parse timezone name: ${timeZoneName}`)

  const [, sign, hour, minute] = matchData
  let result = parseInt(hour, 10) * 60
  if (sign === '+') result *= -1
  if (minute) result += parseInt(minute, 10)

  return result * -1
}
