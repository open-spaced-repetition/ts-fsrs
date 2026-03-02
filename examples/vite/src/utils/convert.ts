import { convertCsvToFsrsItems } from '@open-spaced-repetition/binding'
import { getTimezoneOffset } from './timezone'

export async function convertFSRSItemByFile(
  file: File,
  nextDayStartsAt: number
) {
  const arrayBuffer: ArrayBuffer | null = await file.arrayBuffer()
  const buffer: Uint8Array | null = new Uint8Array(arrayBuffer)

  // Convert CSV to FSRS items
  // We pass the user's local timezone as the string argument (though it might be ignored by our custom offset function depending on binding implementation,
  // but we should pass something valid).
  // Actually, the binding expects a timezone string.
  // Since we are using a custom offset function that ignores the timezone string and uses local time,
  // we can pass the local timezone string just in case.
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const fsrsItems = convertCsvToFsrsItems(
    buffer,
    nextDayStartsAt,
    timezone,
    getTimezoneOffset
  )

  return fsrsItems
}
