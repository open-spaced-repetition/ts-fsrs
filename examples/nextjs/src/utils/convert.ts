import type { FSRSBindingItem } from '@open-spaced-repetition/binding'
import { getSupportedTimezones } from '@/utils/timezone'

type ConvertCsvToFsrsItems = (
  data: Uint8Array,
  nextDayStartsAt: number,
  timezone: string
) => FSRSBindingItem[]

export async function convertFSRSItemByFile(
  file: File,
  nextDayStartsAt: number,
  timezone: string,
  convertCsvToFsrsItems: ConvertCsvToFsrsItems
) {
  const arrayBuffer: ArrayBuffer | null = await file.arrayBuffer()
  const buffer: Uint8Array | null = new Uint8Array(arrayBuffer)

  if (!getSupportedTimezones.includes(timezone)) {
    throw new Error(`Unsupported timezone: ${timezone}`)
  }

  // Convert CSV to FSRS items
  const fsrsItems = convertCsvToFsrsItems(buffer, nextDayStartsAt, timezone)

  return fsrsItems
}
