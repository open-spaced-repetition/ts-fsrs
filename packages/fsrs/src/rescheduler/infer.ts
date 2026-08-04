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

export interface ReschedulerOptions {
  /**
   * Sorts the review history by `reviewTime` in ascending order before
   * rebuilding memory. Disable it when the history is already sorted.
   *
   * @default true
   */
  readonly sortHistory?: boolean
}

export interface RescheduleResult<MemoryState extends object> {
  readonly memoryState: MemoryState
  readonly memoryStates: MemoryState[]
}
