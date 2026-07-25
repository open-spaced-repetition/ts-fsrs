import type {
  AnySchedulerCore,
  Grade,
  ModelReview,
} from '@open-spaced-repetition/srs-kit'

type MemoryStateOf<Scheduler extends AnySchedulerCore> = ReturnType<
  Scheduler['model']['forward']
>[number]

type TimeOf<Scheduler extends AnySchedulerCore> = ReturnType<
  Scheduler['chrono']['now']
>

export interface ReschedulerReview<Time> {
  readonly rating: Grade
  readonly reviewTime: Time
}

export interface RescheduleInput<MemoryState extends object, Time> {
  readonly history: readonly ReschedulerReview<Time>[]
  readonly initialState?: Readonly<MemoryState> | null
}

export interface RescheduleResult<MemoryState extends object> {
  readonly memoryState: MemoryState
}

/**
 * Rebuilds model memory from review history using an existing srs-kit
 * scheduler core.
 *
 * The scheduler instance keeps the model and chronology coupled, allowing the
 * review-time and memory-state types to be inferred from the selected core.
 */
export class Rescheduler<Scheduler extends AnySchedulerCore> {
  constructor(readonly scheduler: Scheduler) {}

  reschedule(
    input: RescheduleInput<MemoryStateOf<Scheduler>, TimeOf<Scheduler>>
  ): RescheduleResult<MemoryStateOf<Scheduler>> {
    const memoryStates = this.scheduler.model.forward({
      history: this.prepareHistory(input.history),
      initialState: input.initialState,
    }) as readonly MemoryStateOf<Scheduler>[]
    const memoryState =
      memoryStates.at(-1) ??
      (input.initialState as MemoryStateOf<Scheduler> | null | undefined)

    if (!memoryState) {
      throw new Error('Rescheduler requires history or an initialState')
    }

    return { memoryState }
  }

  private prepareHistory(
    history: readonly ReschedulerReview<TimeOf<Scheduler>>[]
  ): readonly ModelReview[] {
    let previousReviewTime: TimeOf<Scheduler> | undefined

    return history.map((review): ModelReview => {
      const deltaT =
        previousReviewTime === undefined
          ? 0
          : this.scheduler.chrono.difference(
              previousReviewTime,
              review.reviewTime
            )

      if (!Number.isFinite(deltaT) || deltaT < 0) {
        throw new RangeError(
          'Review times must produce finite non-negative intervals'
        )
      }

      previousReviewTime = review.reviewTime
      return { rating: review.rating, deltaT }
    })
  }
}
