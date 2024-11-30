import type {
  CardInput,
  DateInput,
  FSRSHistory,
  Grade,
  RecordLog,
  RecordLogItem,
} from './models'

export type unit = 'days' | 'minutes'
export type int = number & { __int__: void }
export type double = number & { __double__: void }

export interface IPreview extends RecordLog {
  [Symbol.iterator](): IterableIterator<RecordLogItem>
}

export interface IScheduler {
  preview(): IPreview
  review(state: Grade): RecordLogItem
}

/**
 * Options for rescheduling.
 *
 * @template T - The type of the result returned by the `recordLogHandler` function.
 */
export type RescheduleOptions<T = RecordLogItem> = {
  /**
   * A function that handles recording the log.
   *
   * @param recordLog - The log to be recorded.
   * @returns The result of recording the log.
   */
  recordLogHandler: (recordLog: RecordLogItem) => T

  /**
   * A function that defines the order of reviews.
   *
   * @param a - The first FSRSHistory object.
   * @param b - The second FSRSHistory object.
   * @returns A negative number if `a` should be ordered before `b`, a positive number if `a` should be ordered after `b`, or 0 if they have the same order.
   */
  reviewsOrderBy: (a: FSRSHistory, b: FSRSHistory) => number

  /**
   * Indicating whether to skip manual steps.
   */
  skipManual: boolean

  /**
   * Indicating whether to update the FSRS memory state.
   */
  update_memory_state: boolean

  /**
   * The current date and time.
   */
  now: DateInput

  /**
   * The input for the first card.
   */
  first_card?: CardInput
}

export type IReschedule<T = RecordLogItem> = {
  collections: T[]
  reschedule_item: T | null
}
