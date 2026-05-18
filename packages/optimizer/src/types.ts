import { DEFAULT_NEXT_DAY_STARTS_AT, DEFAULT_TIMEZONE } from './constants'

export class FSRSReview {
  public readonly rating: number
  public readonly deltaT: number

  constructor(rating: number, deltaT: number) {
    this.rating = rating
    this.deltaT = deltaT
  }
}

export type FSRSReviewLike =
  | FSRSReview
  | {
      rating: number
      deltaT?: number
      delta_t?: number
    }

export class FSRSItem {
  public readonly reviews: readonly FSRSReview[]

  constructor(reviews: readonly FSRSReviewLike[]) {
    this.reviews = reviews.map((review) => normalizeReview(review))
  }

  get current(): FSRSReview | undefined {
    return this.reviews.at(-1)
  }

  longTermReviewCnt(): number {
    return this.reviews.filter((review) => review.deltaT > 0).length
  }

  includeLongTermReviews(): boolean {
    return this.reviews.some((review) => review.deltaT > 0)
  }

  firstLongTermReview(): FSRSReview {
    const review = this.reviews.find((candidate) => candidate.deltaT > 0)
    if (!review) {
      throw new Error(
        'Invalid FSRS item: at least one review with deltaT > 0 is required'
      )
    }
    return review
  }

  clone(): FSRSItem {
    return new FSRSItem(this.reviews)
  }
}

export type FSRSItemLike =
  | FSRSItem
  | {
      reviews: readonly FSRSReviewLike[]
    }

export interface MemoryState {
  stability: number
  difficulty: number
}

export interface WeightedFSRSItem {
  readonly weight: number
  readonly item: FSRSItem
}

export interface ComputeParametersOptions {
  enableShortTerm?: boolean
  numRelearningSteps?: number
  progress?: (current: number, total: number) => boolean | undefined
  timeout?: number
  signal?: AbortSignal
  seed?: number
  batchSize?: number
  numEpochs?: number
  learningRate?: number
  gamma?: number
  maxSeqLen?: number
  gradientEpsilon?: number
  beta1?: number
  beta2?: number
  adamEpsilon?: number
}

export interface CsvConvertOptions {
  nextDayStartsAt?: number
  timezone?: string
  offsetProvider?: (ms: number, timezone: string) => number
}

export type CsvChunk = string | ArrayBuffer | ArrayBufferView<ArrayBufferLike>

export interface CsvReadableStreamReaderLike {
  read(): Promise<{ done?: boolean; value?: CsvChunk }>
  releaseLock?(): void
}

export interface CsvReadableStreamLike {
  getReader(): CsvReadableStreamReaderLike
}

export interface CsvTextLike {
  text(): Promise<string>
  stream?(): CsvReadableStreamLike
}

/**
 * CSV input accepted by `convertCsvToFsrsItems`.
 *
 * In Node.js, a string without CSV-looking content is treated as a file path.
 * In browsers, a string without CSV-looking content is treated as a fetchable URL
 * when it can be resolved against `globalThis.location`.
 */
export type CsvSource =
  | string
  | URL
  | CsvChunk
  | CsvTextLike
  | CsvReadableStreamLike
  | Iterable<CsvChunk>
  | AsyncIterable<CsvChunk>

export interface RequiredCsvConvertOptions {
  nextDayStartsAt: number
  timezone: string
  offsetProvider: (ms: number, timezone: string) => number
}

export interface CsvSourceEntry {
  card_id: string
  review_time: number
  review_rating: number
  review_state: number
  review_duration: number
  last_interval: number
}

export interface PreparedTrainingItem {
  readonly item: FSRSItem
  readonly weight: number
  readonly historyRatings: readonly number[]
  readonly historyDeltaTs: readonly number[]
  readonly currentDeltaT: number
  readonly label: 0 | 1
}

export function normalizeReview(review: FSRSReviewLike): FSRSReview {
  if (review instanceof FSRSReview) {
    return review
  }
  const deltaT = review.deltaT ?? review.delta_t ?? 0
  return new FSRSReview(review.rating, deltaT)
}

export function normalizeItem(item: FSRSItemLike): FSRSItem {
  if (item instanceof FSRSItem) {
    return item
  }
  return new FSRSItem(item.reviews)
}

export function normalizeItems(items: readonly FSRSItemLike[]): FSRSItem[] {
  return items.map((item) => normalizeItem(item))
}

export function resolveCsvOptions(
  options: CsvConvertOptions | undefined
): RequiredCsvConvertOptions {
  return {
    nextDayStartsAt: options?.nextDayStartsAt ?? DEFAULT_NEXT_DAY_STARTS_AT,
    timezone: options?.timezone ?? DEFAULT_TIMEZONE,
    offsetProvider:
      options?.offsetProvider ??
      ((ms, timezone) => getTimezoneOffset(timezone, ms)),
  }
}

const tzCache = new Map<string, Intl.DateTimeFormat>()

function getTimezoneFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = tzCache.get(timeZone)
  if (cached) {
    return cached
  }
  const formatter = new Intl.DateTimeFormat('ia', {
    timeZoneName: 'shortOffset',
    timeZone,
  })
  tzCache.set(timeZone, formatter)
  return formatter
}

export function getTimezoneOffset(
  timeZone: string,
  date: Date | number
): number {
  const offsetName = getTimezoneFormatter(timeZone)
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value

  if (!offsetName || offsetName === 'GMT' || offsetName === 'UTC') {
    return 0
  }

  const match = offsetName.match(/([+-])(\d+)(?::(\d+))?/)
  if (!match) {
    throw new Error(`Cannot parse timezone offset from: ${offsetName}`)
  }

  const [, sign, hours, minutes] = match
  let offset = Number.parseInt(hours, 10) * 60
  if (minutes) {
    offset += Number.parseInt(minutes, 10)
  }
  return sign === '+' ? offset : -offset
}
