import {
  convertCsvToFsrsItems,
  type FSRSBindingItem,
} from '@open-spaced-repetition/binding'
import { getTimezoneOffset } from './timezone'

/**
 * Read a CSV file and convert it to FSRS binding items using the user's
 * local timezone. The binding's offset-provider callback ignores the
 * timezone string and falls back to the local system offset.
 */
export async function convertFSRSItemByFile(
  file: File,
  nextDayStartsAt: number
): Promise<FSRSBindingItem[]> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  // Pass a valid IANA zone so the binding accepts the input; the actual
  // offset is computed by `getTimezoneOffset` against the host system.
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  return convertCsvToFsrsItems(
    buffer,
    nextDayStartsAt,
    timezone,
    getTimezoneOffset
  )
}
