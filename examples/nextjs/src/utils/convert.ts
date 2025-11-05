import { convertCsvToFsrsItems } from '@open-spaced-repetition/binding'
import { getTimezoneOffset } from '@/utils/timezone'

export async function convertFSRSItemByFile(
  file: File,
  nextDayStartsAt: number,
  timezone: string
) {
  const arrayBuffer: ArrayBuffer | null = await file.arrayBuffer()
  const buffer: Uint8Array | null = new Uint8Array(arrayBuffer)

  // Convert CSV to FSRS items
  const fsrsItems = convertCsvToFsrsItems(
    buffer,
    nextDayStartsAt,
    timezone,
    getTimezoneOffset
  )

  return fsrsItems
}
