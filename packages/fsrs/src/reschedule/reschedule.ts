import {
  type AnySchedulerCore,
  type ModelReview,
  parse,
} from '@open-spaced-repetition/srs-kit'
import { FSRSValidationError } from '../error.js'
import type {
  CardOf,
  GradeOf,
  MemoryStateOf,
  NonManualReview,
  RatingOf,
  ReplayInput,
  ReplayResultOf,
  RescheduleInput,
  RescheduleOptions,
  RescheduleResult,
  RescheduleReview,
  TimeOf,
} from './infer.js'

// History may include manual ratings, but every possible scheduler must accept each value.
type HistoryRating<S extends AnySchedulerCore> = (
  S extends AnySchedulerCore
    ? (rating: RatingOf<S>) => void
    : never
) extends (rating: infer R extends number) => void
  ? R
  : never

/** A typed array with one fixed-width row per review. */
interface PackedMemoryStates {
  readonly length: number
  subarray(begin: number): object
}

function isPackedMemoryStates(value: unknown): value is PackedMemoryStates {
  return ArrayBuffer.isView(value) && !(value instanceof DataView)
}

/** Returns the last state, or a view of the last row of a packed result. */
function lastMemoryState(memoryStates: unknown, reviewCount: number): object {
  if (Array.isArray(memoryStates)) {
    return memoryStates[memoryStates.length - 1]
  }
  if (
    isPackedMemoryStates(memoryStates) &&
    memoryStates.length > 0 &&
    memoryStates.length % reviewCount === 0
  ) {
    return memoryStates.subarray(
      memoryStates.length - memoryStates.length / reviewCount
    )
  }
  throw new FSRSValidationError(
    'Model forward must return an array or a typed array with one fixed-width row per review'
  )
}

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
    input: ReplayInput<
      MemoryStateOf<Scheduler>,
      TimeOf<Scheduler>,
      HistoryRating<Scheduler>
    >,
    options: RescheduleOptions = {}
  ): ReplayResultOf<Scheduler> {
    const reviews = this.prepareReviews(input.history, options)
    const memoryStates: unknown = this.scheduler.model.forward({
      history: this.toModelHistory(reviews),
      initialState: input.initialState,
    })

    return {
      memoryState: lastMemoryState(memoryStates, reviews.length),
      memoryStates,
    } as ReplayResultOf<Scheduler>
  }

  /**
   * Replays the review history through the scheduler and returns the card and
   * revlog produced by each review.
   */
  reschedule(
    input: RescheduleInput<
      CardOf<Scheduler>,
      TimeOf<Scheduler>,
      HistoryRating<Scheduler>
    >,
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
    history: readonly RescheduleReview<
      TimeOf<Scheduler>,
      HistoryRating<Scheduler>
    >[],
    { sortHistory = true }: RescheduleOptions
  ): NonManualReview<TimeOf<Scheduler>, GradeOf<Scheduler>>[] {
    const reviews: NonManualReview<TimeOf<Scheduler>, GradeOf<Scheduler>>[] = []
    const { chrono: chronoDefinition } = this.scheduler.definition
    const { ratingSchema, isManual } = this.scheduler.ratings

    for (const review of history) {
      const rating = parse(ratingSchema, review.rating)
      if (isManual(rating)) continue

      reviews.push({
        rating: rating as GradeOf<Scheduler>,
        reviewTime: parse(chronoDefinition.schema.time, review.reviewTime),
      })
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
    history: readonly NonManualReview<TimeOf<Scheduler>, GradeOf<Scheduler>>[]
  ): ModelReview<GradeOf<Scheduler>>[] {
    const modelHistory: ModelReview<GradeOf<Scheduler>>[] = new Array(
      history.length
    )
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
