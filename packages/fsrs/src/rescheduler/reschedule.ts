import {
  type AnySchedulerCore,
  type ModelReview,
  Rating,
} from '@open-spaced-repetition/srs-kit'
import { FSRSValidationError } from '../error.js'
import type {
  MemoryStateOf,
  RescheduleInput,
  RescheduleResult,
  ReschedulerOptions,
  ReschedulerReview,
  TimeOf,
} from './infer.js'

type NonManualReview<Time> = ReschedulerReview<Time> & {
  readonly rating: Exclude<Rating, typeof Rating.Manual>
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
    input: RescheduleInput<MemoryStateOf<Scheduler>, TimeOf<Scheduler>>,
    { sortHistory = true }: ReschedulerOptions = {}
  ): RescheduleResult<MemoryStateOf<Scheduler>> {
    const reviews = input.history.filter(
      (review): review is NonManualReview<TimeOf<Scheduler>> =>
        review.rating !== Rating.Manual
    )

    if (reviews.length === 0) {
      throw new FSRSValidationError(
        'Rescheduler requires at least one non-manual review'
      )
    }

    if (sortHistory) {
      reviews.sort((left, right) =>
        this.scheduler.chrono.difference(right.reviewTime, left.reviewTime)
      )
    }

    const memoryStates = this.scheduler.model.forward({
      history: this.prepareHistory(reviews),
      initialState: input.initialState,
    }) as MemoryStateOf<Scheduler>[]

    return { memoryState: memoryStates[memoryStates.length - 1], memoryStates }
  }

  /**
   * Maps every review onto one model review, so the returned history always
   * has the same length as the given reviews. The first review has no
   * predecessor and therefore carries `deltaT: 0`.
   */
  private prepareHistory(
    history: readonly NonManualReview<TimeOf<Scheduler>>[]
  ): ModelReview[] {
    const modelHistory: ModelReview[] = new Array(history.length)
    modelHistory[0] = { rating: history[0].rating, deltaT: 0 }
    let previousReviewTime = history[0].reviewTime

    for (let index = 1; index < history.length; index++) {
      const review = history[index]
      const deltaT = this.scheduler.chrono.difference(
        previousReviewTime,
        review.reviewTime
      )

      if (!Number.isFinite(deltaT) || deltaT < 0) {
        throw new FSRSValidationError(
          'Review times must produce finite non-negative intervals'
        )
      }

      previousReviewTime = review.reviewTime
      modelHistory[index] = { rating: review.rating, deltaT }
    }

    return modelHistory
  }
}
