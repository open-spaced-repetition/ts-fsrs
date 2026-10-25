import type {
  CardInput,
  DateInput,
  FSRSHistory,
  Grade,
  RecordLog,
  RecordLogItem,
} from './models.js'

/** @deprecated Use explicit day/minute units at the call site. */
export type unit = 'days' | 'minutes'
/** @deprecated Use number with integer validation where required. */
export type int = number & { __int__: undefined }
/** @deprecated Use number. */
export type double = number & { __double__: undefined }

/** @deprecated Use the return type of scheduler.preview. */
export interface IPreview extends RecordLog {
  [Symbol.iterator](): IterableIterator<RecordLogItem>
}

/** @deprecated Use the inferred scheduler type returned by DefaultScheduler or defineScheduler. */
export interface IScheduler {
  /** @deprecated Use scheduler.preview({ card, now }) from the new scheduler API. */
  preview(): IPreview
  /** @deprecated Use scheduler.review({ card, now, grade }) from the new scheduler API. */
  review(state: Grade): RecordLogItem
}

/**
 * Options for rescheduling.
 * @deprecated Use RescheduleOptions from ts-fsrs/reschedule; the options are not interchangeable.
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

/** @deprecated Use RescheduleResult from ts-fsrs/reschedule. */
export type IReschedule = {
  collections: RecordLogItem[]
  reschedule_item: RecordLogItem | null
}
