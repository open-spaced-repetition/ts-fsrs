import type { AnySchedulerCore, Rating } from '@open-spaced-repetition/srs-kit'

export type MemoryStateOf<Scheduler extends AnySchedulerCore> = ReturnType<
  Scheduler['model']['forward']
>[number]

export type TimeOf<Scheduler extends AnySchedulerCore> = ReturnType<
  Scheduler['chrono']['now']
>

export type CardOf<Scheduler extends AnySchedulerCore> = Parameters<
  Scheduler['review']
>[0]['card']

export type ScheduleResultOf<Scheduler extends AnySchedulerCore> = ReturnType<
  Scheduler['forward']
>[number]

export interface RescheduleReview<Time> {
  readonly rating: Rating
  readonly reviewTime: Time
}

export type NonManualReview<Time> = RescheduleReview<Time> & {
  readonly rating: Exclude<Rating, typeof Rating.Manual>
}

export interface ReplayInput<MemoryState extends object, Time> {
  readonly history: readonly RescheduleReview<Time>[]
  readonly initialState?: Readonly<MemoryState> | null
}

export interface RescheduleInput<Card, Time> {
  readonly history: readonly RescheduleReview<Time>[]
  readonly initialCard?: Card
}

export interface RescheduleOptions {
  /**
   * Sorts the review history by `reviewTime` in ascending order before
   * replaying it. Disable it when the history is already sorted.
   *
   * @default true
   */
  readonly sortHistory?: boolean
}

export interface ReplayResult<MemoryState extends object> {
  readonly memoryState: MemoryState
  readonly memoryStates: MemoryState[]
}

export interface RescheduleResult<Scheduler extends AnySchedulerCore> {
  readonly collections: ScheduleResultOf<Scheduler>[]
  readonly card: ScheduleResultOf<Scheduler>['card']
}
