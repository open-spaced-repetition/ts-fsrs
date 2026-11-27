import type {
  AnySchedulerCore,
  ForwardItem,
  Prettify,
  Rating,
} from '@open-spaced-repetition/srs-kit'

export type MemoryStateOf<Scheduler extends AnySchedulerCore> = ReturnType<
  Scheduler['model']['step']
>

/** The model's `forward` result, with array results made mutable. */
export type MemoryStatesOf<Scheduler extends AnySchedulerCore> =
  ReturnType<Scheduler['model']['forward']> extends readonly (infer State)[]
    ? State[]
    : ReturnType<Scheduler['model']['forward']>

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

export interface ReplayResult<
  MemoryState extends object,
  MemoryStates = MemoryState[],
> {
  readonly memoryState: MemoryState
  readonly memoryStates: MemoryStates
}

/**
 * Array results yield their last memory state. Other results are packed typed
 * arrays with one fixed-width row per review; `memoryState` is a view of the
 * last row, sharing the buffer of `memoryStates`.
 */
export type ReplayResultOf<Scheduler extends AnySchedulerCore> = ReplayResult<
  MemoryStatesOf<Scheduler> extends readonly unknown[]
    ? MemoryStateOf<Scheduler>
    : Extract<MemoryStatesOf<Scheduler>, object>,
  MemoryStatesOf<Scheduler>
>

export type RescheduleResult<Scheduler extends AnySchedulerCore> = Prettify<{
  readonly results: Prettify<ScheduleResultOf<Scheduler>>[]
  readonly card: ScheduleResultOf<Scheduler>['card']
}>
