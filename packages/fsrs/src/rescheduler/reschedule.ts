import {
  type AnySchedulerCore,
  type ModelReview,
  parse,
  Rating,
  ratingSchema,
} from '@open-spaced-repetition/srs-kit'
import { FSRSValidationError } from '../error.js'
import type {
  CardOf,
  MemoryStateOf,
  NonManualReview,
  ReplayInput,
  ReplayResult,
  RescheduleInput,
  RescheduleOptions,
  RescheduleResult,
  TimeOf,
} from './infer.js'

/**
 * Replays a review history on top of an existing srs-kit scheduler core.
 *
 * The scheduler instance keeps the model and chronology coupled, allowing the
 * review-time, card and memory-state types to be inferred from the selected
 * core.
 */
export class Reschedule<Scheduler extends AnySchedulerCore> {
  constructor(readonly scheduler: Scheduler) {}

  /**
   * Rebuilds model memory from the review history and returns the memory state
   * after each review.
   */
  replay(
    input: ReplayInput<MemoryStateOf<Scheduler>, TimeOf<Scheduler>>,
    options: RescheduleOptions = {}
  ): ReplayResult<MemoryStateOf<Scheduler>> {
    const reviews = this.prepareReviews(input.history, options, true)
    const memoryStates = this.scheduler.model.forward({
      history: this.toModelHistory(reviews),
      initialState: input.initialState,
    }) as MemoryStateOf<Scheduler>[]

    return { memoryState: memoryStates[memoryStates.length - 1], memoryStates }
  }

  /**
   * Replays the review history through the scheduler and returns the card and
   * revlog produced by each review.
   */
  reschedule(
    input: RescheduleInput<CardOf<Scheduler>, TimeOf<Scheduler>>,
    options: RescheduleOptions = {}
  ): RescheduleResult<Scheduler> {
    const history = this.prepareReviews(input.history, options)
    const results = this.scheduler.forward({
      history,
      initialCard: input.initialCard,
    }) as RescheduleResult<Scheduler>['results']

    return { results, card: results[results.length - 1].card }
  }

  private prepareReviews(
    history: readonly {
      readonly rating: Rating
      readonly reviewTime: TimeOf<Scheduler>
    }[],
    { sortHistory = true }: RescheduleOptions,
    canonicalizeTime = false
  ): NonManualReview<TimeOf<Scheduler>>[] {
    const reviews: NonManualReview<TimeOf<Scheduler>>[] = []
    const { chrono: chronoDefinition } = this.scheduler.definition

    for (const review of history) {
      const rating = parse(ratingSchema, review.rating)
      if (rating === Rating.Manual) continue

      reviews.push(
        canonicalizeTime
          ? {
              rating,
              reviewTime: parse(
                chronoDefinition.schema.time,
                review.reviewTime
              ),
            }
          : (review as NonManualReview<TimeOf<Scheduler>>)
      )
    }

    if (reviews.length === 0) {
      throw new FSRSValidationError(
        'Reschedule requires at least one non-manual review'
      )
    }

    const compare = this.scheduler.chrono.compare
    if (sortHistory && compare) {
      reviews.sort((left, right) => compare(left.reviewTime, right.reviewTime))
    }

    return reviews
  }

  private toModelHistory(
    history: readonly NonManualReview<TimeOf<Scheduler>>[]
  ): ModelReview[] {
    const modelHistory: ModelReview[] = new Array(history.length)
    modelHistory[0] = { rating: history[0].rating, deltaT: 0 }

    for (let index = 1; index < history.length; index++) {
      const deltaT = this.scheduler.chrono.difference(
        history[index - 1].reviewTime,
        history[index].reviewTime
      )

      if (!Number.isFinite(deltaT) || deltaT < 0) {
        throw new FSRSValidationError(
          'Review times must produce finite non-negative intervals'
        )
      }

      modelHistory[index] = { rating: history[index].rating, deltaT }
    }

    return modelHistory
  }
}
