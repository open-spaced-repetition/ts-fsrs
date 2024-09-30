import type {
  Card,
  CardInput,
  FSRSHistory,
  Grade,
  RecordLog,
  RecordLogItem,
  ReviewLog,
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

export type RescheduleOptions<T = RecordLogItem> = {
  recordLogHandler: (recordLog: RecordLogItem) => T
  reviewsOrderBy: (a: FSRSHistory, b: FSRSHistory) => number
  skipManual: boolean
  update_memory_state: boolean
  first_card?: CardInput
}

export type IReschedule<T = RecordLogItem> = {
  collections: T[]
  reschedule_item: T | null
}
