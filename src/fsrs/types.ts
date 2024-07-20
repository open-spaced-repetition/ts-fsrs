import type {
  Card,
  Grade,
  RecordLog,
  RecordLogItem,
} from './models'

export type unit = 'days' | 'minutes'
export type int = number & { __int__: void }
export type double = number & { __double__: void }

export interface IScheduler {
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
