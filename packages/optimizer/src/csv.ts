import type {
  CsvChunk,
  CsvConvertOptions,
  CsvReadableStreamLike,
  CsvSource,
  CsvSourceEntry,
  CsvTextLike,
  FSRSItem,
  RequiredCsvConvertOptions,
} from './types'
import {
  FSRSItem as FSRSItemClass,
  FSRSReview,
  resolveCsvOptions,
} from './types'

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index++) {
    const char = line[index]
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === ',' && !inQuotes) {
      fields.push(current)
      current = ''
      continue
    }
    current += char
  }

  fields.push(current)
  return fields
}

function convertToDate(
  timestamp: number,
  options: RequiredCsvConvertOptions
): Date {
  const adjustedMs =
    Math.floor(timestamp / 1000) * 1000 +
    options.offsetProvider(timestamp, options.timezone) * 60 * 1000 -
    options.nextDayStartsAt * 60 * 60 * 1000
  return new Date(adjustedMs)
}

function wholeDays(left: Date, right: Date): number {
  const leftUtc = Date.UTC(
    left.getUTCFullYear(),
    left.getUTCMonth(),
    left.getUTCDate()
  )
  const rightUtc = Date.UTC(
    right.getUTCFullYear(),
    right.getUTCMonth(),
    right.getUTCDate()
  )
  return Math.floor((rightUtc - leftUtc) / (24 * 60 * 60 * 1000))
}

function removeRevlogBeforeLastFirstLearn(
  entries: readonly CsvSourceEntry[]
): CsvSourceEntry[] {
  const isLearningState = (entry: CsvSourceEntry) =>
    entry.review_state === 0 || entry.review_state === 1

  let lastLearningBlockStart: number | null = null
  for (let index = entries.length - 1; index >= 0; index--) {
    if (isLearningState(entries[index])) {
      lastLearningBlockStart = index
    } else if (lastLearningBlockStart != null) {
      break
    }
  }

  if (lastLearningBlockStart == null) {
    return []
  }
  return entries.slice(lastLearningBlockStart).map((entry) => ({ ...entry }))
}

function convertEntriesToItems(
  entries: readonly CsvSourceEntry[],
  options: RequiredCsvConvertOptions
): Array<{ item: FSRSItem; reviewTime: number }> {
  const filteredEntries = removeRevlogBeforeLastFirstLearn(entries)
  if (filteredEntries.length === 0) {
    return []
  }

  let previousDate = convertToDate(filteredEntries[0].review_time, options)
  for (let index = 1; index < filteredEntries.length; index++) {
    const currentDate = convertToDate(
      filteredEntries[index].review_time,
      options
    )
    filteredEntries[index].last_interval = wholeDays(previousDate, currentDate)
    previousDate = currentDate
  }

  const result: Array<{ item: FSRSItem; reviewTime: number }> = []
  for (let index = 1; index < filteredEntries.length; index++) {
    const reviews = filteredEntries.slice(0, index + 1).map((entry) => {
      return new FSRSReview(
        entry.review_rating,
        Math.max(0, entry.last_interval)
      )
    })
    if (reviews.at(-1)?.deltaT && reviews.at(-1)!.deltaT > 0) {
      result.push({
        item: new FSRSItemClass(reviews),
        reviewTime: filteredEntries[index].review_time,
      })
    }
  }
  return result
}

function isNodeRuntime(): boolean {
  return (
    typeof process !== 'undefined' &&
    typeof process.versions === 'object' &&
    typeof process.versions.node === 'string'
  )
}

function looksLikeCsvText(value: string): boolean {
  const trimmed = value.trimStart()
  return (
    value.includes('\n') ||
    value.includes('\r') ||
    trimmed.startsWith('review_time,') ||
    trimmed.startsWith('card_id,')
  )
}

function browserBaseUrl(): string | undefined {
  const candidate = globalThis as { location?: { href?: string } }
  return candidate.location?.href
}

function parseBrowserUrl(value: string): URL | null {
  const isAbsoluteUrl = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value)
  const isRelativeUrl =
    value.startsWith('/') ||
    value.startsWith('./') ||
    value.startsWith('../') ||
    !value.includes(',')

  if (!isAbsoluteUrl && !isRelativeUrl) {
    return null
  }

  try {
    return new URL(value, browserBaseUrl())
  } catch {
    return null
  }
}

function isArrayBufferView(value: unknown): value is ArrayBufferView {
  return ArrayBuffer.isView(value)
}

function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return value instanceof ArrayBuffer
}

function isReadableStreamLike(value: unknown): value is CsvReadableStreamLike {
  const candidate = value as { getReader?: unknown }
  return (
    typeof value === 'object' &&
    value != null &&
    typeof candidate.getReader === 'function'
  )
}

function isTextLike(value: unknown): value is CsvTextLike {
  const candidate = value as { text?: unknown }
  return (
    typeof value === 'object' &&
    value != null &&
    typeof candidate.text === 'function'
  )
}

function isAsyncIterable(value: unknown): value is AsyncIterable<CsvChunk> {
  return (
    typeof value === 'object' && value != null && Symbol.asyncIterator in value
  )
}

function isIterable(value: unknown): value is Iterable<CsvChunk> {
  return typeof value === 'object' && value != null && Symbol.iterator in value
}

async function* readNodeFile(source: string | URL): AsyncGenerator<CsvChunk> {
  const fsModuleName = 'node:fs'
  const { createReadStream } = (await import(
    fsModuleName
  )) as typeof import('node:fs')
  for await (const chunk of createReadStream(source)) {
    yield chunk as CsvChunk
  }
}

async function* readFetchUrl(source: URL): AsyncGenerator<CsvChunk> {
  if (typeof fetch !== 'function') {
    throw new TypeError(`Cannot fetch CSV URL without fetch(): ${source.href}`)
  }

  const response = await fetch(source)
  if (!response.ok) {
    throw new Error(
      `Failed to fetch CSV URL ${source.href}: ${response.status}`
    )
  }

  if (response.body && isReadableStreamLike(response.body)) {
    yield* readReadableStream(response.body)
    return
  }

  yield await response.text()
}

async function* readReadableStream(
  source: CsvReadableStreamLike
): AsyncGenerator<CsvChunk> {
  const reader = source.getReader()

  try {
    while (true) {
      const result = await reader.read()
      if (result.done) {
        break
      }
      if (result.value != null) {
        yield result.value
      }
    }
  } finally {
    reader.releaseLock?.()
  }
}

async function* iterateChunks(source: CsvSource): AsyncGenerator<CsvChunk> {
  if (typeof source === 'string') {
    if (looksLikeCsvText(source)) {
      yield source
      return
    }
    if (!isNodeRuntime()) {
      const url = parseBrowserUrl(source)
      if (url) {
        yield* readFetchUrl(url)
        return
      }
      yield source
      return
    }
    yield* readNodeFile(source)
    return
  }

  if (source instanceof URL) {
    if (source.protocol === 'file:' && isNodeRuntime()) {
      yield* readNodeFile(source)
      return
    }
    yield* readFetchUrl(source)
    return
  }

  if (isArrayBuffer(source) || isArrayBufferView(source)) {
    yield source
    return
  }

  if (isReadableStreamLike(source)) {
    yield* readReadableStream(source)
    return
  }

  if (isTextLike(source)) {
    const stream = source.stream?.()
    if (stream && isReadableStreamLike(stream)) {
      yield* readReadableStream(stream)
      return
    }
    yield await source.text()
    return
  }

  if (isAsyncIterable(source)) {
    for await (const chunk of source) {
      yield chunk
    }
    return
  }

  if (isIterable(source)) {
    for (const chunk of source) {
      yield chunk
    }
    return
  }

  throw new TypeError('Unsupported CSV source')
}

function decodeChunk(chunk: CsvChunk, decoder: TextDecoder): string {
  if (typeof chunk === 'string') {
    return chunk
  }
  if (isArrayBufferView(chunk)) {
    const view = new Uint8Array(
      chunk.buffer,
      chunk.byteOffset,
      chunk.byteLength
    )
    return decoder.decode(view, { stream: true })
  }
  return decoder.decode(chunk, { stream: true })
}

async function* iterateLines(source: CsvSource): AsyncGenerator<string> {
  const decoder = new TextDecoder()
  let pending = ''

  for await (const chunk of iterateChunks(source)) {
    pending += decodeChunk(chunk, decoder)

    let lineStart = 0
    while (true) {
      const lineEnd = pending.indexOf('\n', lineStart)
      if (lineEnd === -1) {
        break
      }
      const line = pending.slice(
        lineStart,
        pending[lineEnd - 1] === '\r' ? lineEnd - 1 : lineEnd
      )
      yield line
      lineStart = lineEnd + 1
    }

    pending = pending.slice(lineStart)
  }

  pending += decoder.decode()
  if (pending.length > 0) {
    yield pending.endsWith('\r') ? pending.slice(0, -1) : pending
  }
}

export async function convertCsvToFsrsItems(
  source: CsvSource,
  options?: CsvConvertOptions
): Promise<FSRSItem[]> {
  const resolved = resolveCsvOptions(options)
  const groups = new Map<string, CsvSourceEntry[]>()
  let headers: string[] | null = null

  for await (const rawLine of iterateLines(source)) {
    const line = rawLine.trim()
    if (line.length === 0) {
      continue
    }

    const fields = parseCsvLine(line)
    if (headers == null) {
      headers = fields
      continue
    }

    const row = Object.fromEntries(
      headers.map((header, index) => [header, fields[index] ?? ''])
    )

    const entry: CsvSourceEntry = {
      card_id: row.card_id,
      review_time: Number.parseInt(row.review_time, 10),
      review_rating: Number.parseInt(row.review_rating, 10),
      review_state: Number.parseInt(row.review_state, 10),
      review_duration: Number.parseInt(row.review_duration, 10),
      last_interval: 0,
    }

    const items = groups.get(entry.card_id) ?? []
    items.push(entry)
    groups.set(entry.card_id, items)
  }

  const converted: Array<{ item: FSRSItem; reviewTime: number }> = []
  for (const entries of groups.values()) {
    entries.sort((left, right) => left.review_time - right.review_time)
    converted.push(...convertEntriesToItems(entries, resolved))
  }

  converted.sort((left, right) => left.reviewTime - right.reviewTime)
  return converted.map((entry) => entry.item)
}
