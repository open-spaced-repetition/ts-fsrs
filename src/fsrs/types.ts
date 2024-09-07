import type {
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
