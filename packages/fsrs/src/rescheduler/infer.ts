import type { AnySchedulerCore, Rating } from '@open-spaced-repetition/srs-kit'

export type MemoryStateOf<Scheduler extends AnySchedulerCore> = ReturnType<
  Scheduler['model']['forward']
>[number]

export type TimeOf<Scheduler extends AnySchedulerCore> = ReturnType<
  Scheduler['chrono']['now']
>

export interface ReschedulerReview<Time> {
  readonly rating: Rating
  readonly reviewTime: Time
}

export interface RescheduleInput<MemoryState extends object, Time> {
  readonly history: readonly ReschedulerReview<Time>[]
  readonly initialState?: Readonly<MemoryState> | null
}

export interface ReschedulerOptions<Time = unknown> {
  readonly enableSort?: boolean
  /**
   * Provides exact ordering for chronology time values when needed.
   *
   * When omitted, Rescheduler delegates ordering to the chronology's
   * difference() method.
   */
  readonly compareReviewTimes?: (left: Time, right: Time) => number
}

export interface RescheduleResult<MemoryState extends object> {
  readonly memoryState: MemoryState
  readonly memoryStates: readonly MemoryState[]
}
