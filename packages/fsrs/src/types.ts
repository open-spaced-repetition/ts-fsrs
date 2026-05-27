import type {
  CardInput,
  DateInput,
  FSRSHistory,
  Grade,
  RecordLog,
  RecordLogItem,
} from './models'

export type unit = 'days' | 'minutes'
export type int = number & { __int__: undefined }
export type double = number & { __double__: undefined }

export interface IPreview extends RecordLog {
  [Symbol.iterator](): IterableIterator<RecordLogItem>
}

export interface IScheduler {
  preview(): IPreview
  review(state: Grade): RecordLogItem
}

/**
 * Options for rescheduling.
 */
export type RescheduleOptions = {
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

export type IReschedule = {
  collections: RecordLogItem[]
  reschedule_item: RecordLogItem | null
}
