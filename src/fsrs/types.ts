import type {
  Card,
  CardInput,
  DateInput,
  Grade,
  RecordLog,
  RecordLogItem,
} from './models'

export type unit = 'days' | 'minutes'
export type int = number & { __int__: void }
export type double = number & { __double__: void }

export interface IScheduler {
  init(card: Card, now: Date): this
  preview(): RecordLog
  review(state: Grade): RecordLogItem
  addPlugin(plugin: ISchedulerLifecycle): this
}

/**
 * @todo
 */
export interface ISchedulerLifecycle {
  init(): void
  update_state(): void
  schedule(): void
  display(): void
}

export interface ITransformer {
  card<T extends Card | CardInput>(card: T): Card
  recordLog<T extends RecordLog>(recordLog: T): RecordLog
  recordLogItem<T extends RecordLogItem>(recordLogItem: T): RecordLogItem
  time<T extends Date | DateInput>(time: T): Date
}
