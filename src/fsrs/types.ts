import type {
  Card,
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

export type RescheduleOptions<T> = {
  recordLogHandler:(recordLog: RecordLogItem) => T
  reviewsOrderBy: (a: FSRSHistory, b: FSRSHistory) => number
  skipManual: boolean
}
