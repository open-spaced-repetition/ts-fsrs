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
    options: ReschedulerOptions = {}
  ): RescheduleResult<MemoryStateOf<Scheduler>> {
    if (input.history.length === 0) {
      throw new FSRSValidationError(
        'Rescheduler requires a non-empty review history'
      )
    }

    const reviews = input.history.filter(
      (review): review is NonManualReview<TimeOf<Scheduler>> =>
        review.rating !== Rating.Manual
    )
    if (reviews.length === 0) {
      throw new FSRSValidationError(
        'Rescheduler requires at least one non-manual review'
      )
    }

    if (options.enableSort ?? true) {
      reviews.sort((left, right) =>
        this.compareReviewTimes(left.reviewTime, right.reviewTime)
      )
    }

    const memoryStates = this.scheduler.model.forward({
      history: this.prepareHistory(reviews),
      initialState: input.initialState,
    }) as MemoryStateOf<Scheduler>[]
    const memoryState = memoryStates[memoryStates.length - 1]

    if (!memoryState) {
      throw new FSRSValidationError(
        'Rescheduler requires at least one non-manual review'
      )
    }

    return { memoryState, memoryStates }
  }

  private prepareHistory(
    history: readonly NonManualReview<TimeOf<Scheduler>>[]
  ): ModelReview[] {
    const iterator = history[Symbol.iterator]()
    const first = iterator.next()
    if (first.done) {
      return []
    }

    const firstReview = first.value
    const modelHistory: ModelReview[] = [
      { rating: firstReview.rating, deltaT: 0 },
    ]
    let previousReviewTime = firstReview.reviewTime

    for (const review of iterator) {
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
      modelHistory.push({ rating: review.rating, deltaT })
    }

    return modelHistory
  }

  private compareReviewTimes(
    left: TimeOf<Scheduler>,
    right: TimeOf<Scheduler>
  ): number {
    const leftValue = left as unknown
    const rightValue = right as unknown

    if (typeof left === 'number' && typeof right === 'number') {
      return left - right
    }

    if (leftValue instanceof Date && rightValue instanceof Date) {
      return leftValue.getTime() - rightValue.getTime()
    }

    if (
      typeof Temporal !== 'undefined' &&
      leftValue instanceof Temporal.Instant &&
      rightValue instanceof Temporal.Instant
    ) {
      return Temporal.Instant.compare(
        leftValue as Temporal.Instant,
        rightValue as Temporal.Instant
      )
    }

    return this.scheduler.chrono.difference(right, left)
  }
}
