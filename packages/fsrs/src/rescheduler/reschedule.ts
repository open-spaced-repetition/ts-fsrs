import {
  type AnySchedulerCore,
  type ModelReview,
  Rating,
} from '@open-spaced-repetition/srs-kit'
import type {
  MemoryStateOf,
  RescheduleInput,
  RescheduleResult,
  ReschedulerOptions,
  ReschedulerReview,
  TimeOf,
} from './infer.js'

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
      throw new Error('Rescheduler requires a non-empty review history')
    }

    const memoryStates = [
      ...this.scheduler.model.forward({
        history: this.prepareHistory(input.history, options.enableSort ?? true),
        initialState: input.initialState,
      }),
    ] as MemoryStateOf<Scheduler>[]
    const memoryState = memoryStates[memoryStates.length - 1]

    if (!memoryState) {
      throw new Error('Rescheduler requires at least one non-manual review')
    }

    return { memoryState, memoryStates }
  }

  private prepareHistory(
    history: readonly ReschedulerReview<TimeOf<Scheduler>>[],
    enableSort: boolean
  ): ModelReview[] {
    const reviews = history.filter((review) => review.rating !== Rating.Manual)

    if (enableSort) {
      reviews.sort((left, right) =>
        this.scheduler.chrono.difference(right.reviewTime, left.reviewTime)
      )
    }

    const modelHistory: ModelReview[] = []
    let previousReviewTime: TimeOf<Scheduler> | undefined

    for (const review of reviews) {
      const rating = review.rating
      if (rating === Rating.Manual) {
        continue
      }

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
      modelHistory.push({ rating, deltaT })
    }

    return modelHistory
  }
}
