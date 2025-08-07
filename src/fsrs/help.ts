import { TypeConvert } from './convert'
import type { DateInput, Grade } from './models'
import { Rating, type State } from './models'
import type { int, unit } from './types'

declare global {
  export interface Date {
    /**
     * @deprecated This method will be removed in version 6.0.0.
     *
     */
    scheduler(t: int, isDay?: boolean): Date
    /**
     * @deprecated This method will be removed in version 6.0.0.
     *
     */
    diff(pre: Date, unit: unit): int
    /**
     * @deprecated This method will be removed in version 6.0.0.
     *
     */
    format(): string
    /**
     * @deprecated This method will be removed in version 6.0.0.
     *
     */
    dueFormat(last_review: Date, unit?: boolean, timeUnit?: string[]): string
  }
}

/* istanbul ignore next */
Date.prototype.scheduler = function (t: int, isDay?: boolean): Date {
  return date_scheduler(this, t, isDay)
}

/**
 * 当前时间与之前的时间差值
 * @param pre 比当前时间还要之前
 * @param unit 单位: days | minutes
 */
/* istanbul ignore next */
Date.prototype.diff = function (pre: Date, unit: unit): int {
  return date_diff(this, pre, unit) as int
}

/* istanbul ignore next */
Date.prototype.format = function (): string {
  return formatDate(this)
}

/* istanbul ignore next */
Date.prototype.dueFormat = function (
  last_review: Date,
  unit?: boolean,
  timeUnit?: string[]
) {
  return show_diff_message(this, last_review, unit, timeUnit)
}

/**
 * 计算日期和时间的偏移，并返回一个新的日期对象。
 * @param now 当前日期和时间
 * @param t 时间偏移量，当 isDay 为 true 时表示天数，为 false 时表示分钟
 * @param isDay （可选）是否按天数单位进行偏移，默认为 false，表示按分钟单位计算偏移
 * @returns 偏移后的日期和时间对象
 */
export function date_scheduler(
  now: DateInput,
  t: number,
  isDay?: boolean
): Date {
  return new Date(
    isDay
      ? TypeConvert.time(now).getTime() + t * 24 * 60 * 60 * 1000
      : TypeConvert.time(now).getTime() + t * 60 * 1000
  )
}

export function date_diff(now: DateInput, pre: DateInput, unit: unit): number {
  if (!now || !pre) {
    throw new Error('Invalid date')
  }
  const diff = TypeConvert.time(now).getTime() - TypeConvert.time(pre).getTime()
  let r = 0
  switch (unit) {
    case 'days':
      r = Math.floor(diff / (24 * 60 * 60 * 1000))
      break
    case 'minutes':
      r = Math.floor(diff / (60 * 1000))
      break
  }
  return r
}

export function formatDate(dateInput: DateInput): string {
  const date = TypeConvert.time(dateInput)
  const year: number = date.getFullYear()
  const month: number = date.getMonth() + 1
  const day: number = date.getDate()
  const hours: number = date.getHours()
  const minutes: number = date.getMinutes()
  const seconds: number = date.getSeconds()

  return `${year}-${padZero(month)}-${padZero(day)} ${padZero(hours)}:${padZero(
    minutes
  )}:${padZero(seconds)}`
}

function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`
}

const TIMEUNIT = [60, 60, 24, 31, 12]
const TIMEUNITFORMAT = ['second', 'min', 'hour', 'day', 'month', 'year']

export function show_diff_message(
  due: DateInput,
  last_review: DateInput,
  unit?: boolean,
  timeUnit: string[] = TIMEUNITFORMAT
): string {
  due = TypeConvert.time(due)
  last_review = TypeConvert.time(last_review)
  if (timeUnit.length !== TIMEUNITFORMAT.length) {
    timeUnit = TIMEUNITFORMAT
  }
  let diff = due.getTime() - last_review.getTime()
  let i = 0
  diff /= 1000
  for (i = 0; i < TIMEUNIT.length; i++) {
    if (diff < TIMEUNIT[i]) {
      break
    } else {
      diff /= TIMEUNIT[i]
    }
  }
  return `${Math.floor(diff)}${unit ? timeUnit[i] : ''}`
}

/* istanbul ignore next */
/**
 *
 * @deprecated Use TypeConvert.time instead
 * @deprecated This function will be removed in version 6.0.0.
 */
export function fixDate(value: unknown) {
  return TypeConvert.time(value)
}

/* istanbul ignore next */
/**
 * @deprecated Use TypeConvert.state instead
 * @deprecated This function will be removed in version 6.0.0.
 */
export function fixState(value: unknown): State {
  return TypeConvert.state(value)
}

/* istanbul ignore next */
/**
 * @deprecated Use TypeConvert.rating instead
 * @deprecated This function will be removed in version 6.0.0.
 */
export function fixRating(value: unknown): Rating {
  return TypeConvert.rating(value)
}

export const Grades: Readonly<Grade[]> = Object.freeze([
  Rating.Again,
  Rating.Hard,
  Rating.Good,
  Rating.Easy,
])

const FUZZ_RANGES = [
  {
    start: 2.5,
    end: 7.0,
    factor: 0.15,
  },
  {
    start: 7.0,
    end: 20.0,
    factor: 0.1,
  },
  {
    start: 20.0,
    end: Infinity,
    factor: 0.05,
  },
] as const

export function get_fuzz_range(
  interval: number,
  elapsed_days: number,
  maximum_interval: number
) {
  let delta = 1.0
  for (const range of FUZZ_RANGES) {
    delta +=
      range.factor * Math.max(Math.min(interval, range.end) - range.start, 0.0)
  }
  interval = Math.min(interval, maximum_interval)
  let min_ivl = Math.max(2, Math.round(interval - delta))
  const max_ivl = Math.min(Math.round(interval + delta), maximum_interval)
  if (interval > elapsed_days) {
    min_ivl = Math.max(min_ivl, elapsed_days + 1)
  }
  min_ivl = Math.min(min_ivl, max_ivl)
  return { min_ivl, max_ivl }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function dateDiffInDays(last: Date, cur: Date) {
  // Discard the time and time-zone information.
  const utc1 = Date.UTC(
    last.getUTCFullYear(),
    last.getUTCMonth(),
    last.getUTCDate()
  )
  const utc2 = Date.UTC(
    cur.getUTCFullYear(),
    cur.getUTCMonth(),
    cur.getUTCDate()
  )

  return Math.floor((utc2 - utc1) / 86400000 /** 1000 * 60 * 60 * 24*/)
}

export function computeDecayFactor(w: number[] | readonly number[] | number) {
  const decayValue = Array.isArray(w) ? w[20] : w;
  const decay = -decayValue;
  const factor = Math.pow(0.9, 1 / decay) - 1;
  return { decay, factor: +factor.toFixed(8) };
}
