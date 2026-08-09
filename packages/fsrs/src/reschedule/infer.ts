import type {
  AnySchedulerCore,
  ForwardItem,
  Rating,
} from '@open-spaced-repetition/srs-kit'

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

/**
 * A review the scheduler can replay, widened to accept manual ratings so they
 * can be filtered out instead of rejected.
 */
export type RescheduleReview<Time> = Omit<ForwardItem<Time>, 'rating'> & {
  readonly rating: Rating
}

export type NonManualReview<Time> = ForwardItem<Time>

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
   * Reviews are ordered through the chronology's optional `compare` operation.
   * When it is omitted, the input order is preserved and the history must
   * already be sorted.
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
  readonly results: ScheduleResultOf<Scheduler>[]
  readonly card: ScheduleResultOf<Scheduler>['card']
}
