import type {
  AnySchedulerCore,
  Rating as RatingValue,
} from '@open-spaced-repetition/srs-kit'

export type MemoryStateOf<Scheduler extends AnySchedulerCore> = ReturnType<
  Scheduler['model']['forward']
>[number]

export type TimeOf<Scheduler extends AnySchedulerCore> = ReturnType<
  Scheduler['chrono']['now']
>

export interface ReschedulerReview<Time> {
  readonly rating: RatingValue
  readonly reviewTime: Time
}

export interface RescheduleInput<MemoryState extends object, Time> {
  readonly history: readonly ReschedulerReview<Time>[]
  readonly initialState?: Readonly<MemoryState> | null
}

export interface ReschedulerOptions {
  readonly enableSort?: boolean
}

export interface RescheduleResult<MemoryState extends object> {
  readonly memoryState: MemoryState
  readonly memoryStates: MemoryState[]
}
