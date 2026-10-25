import type { Grade, Rating, State } from '@open-spaced-repetition/srs-kit'
import type { StepUnit } from '../middlewares/learning-steps/types.js'

export { type Grade, Rating, State } from '@open-spaced-repetition/srs-kit'

/** @deprecated Use keyof typeof State. */
export type StateType = keyof typeof State
/** @deprecated Use keyof typeof Rating. */
export type RatingType = keyof typeof Rating
/** @deprecated Use Exclude<keyof typeof Rating, 'Manual'>. */
export type GradeType = Exclude<RatingType, 'Manual'>

/** @deprecated Use DefaultSchedulerRevlog or the inferred revlog type of your custom scheduler. */
export interface ReviewLog {
  rating: Rating // Rating of the review (Again, Hard, Good, Easy)
  state: State // State of the review (New, Learning, Review, Relearning)
  due: Date // Date of the last scheduling
  stability: number // Memory stability during the review
  difficulty: number // Difficulty of the card during the review
  scheduled_days: number // Number of days until the next review
  learning_steps: number // Keeps track of the current step during the (re)learning stages
  review: Date // Date of the review
}

/** @deprecated Use the return type of scheduler.review, which contains card and revlog. */
export type RecordLogItem = {
  card: Card
  log: ReviewLog
}

/** @deprecated Use the return type of scheduler.preview. */
export type RecordLog = {
  [key in Grade]: RecordLogItem
}

/** @deprecated Use DefaultSchedulerCard or the inferred card type of your custom scheduler. */
export interface Card {
  due: Date // Due date
  stability: number // Stability
  difficulty: number // Difficulty level
  scheduled_days: number // Number of days scheduled
  learning_steps: number // Keeps track of the current step during the (re)learning stages
  reps: number // Repetition count
  lapses: number // Number of lapses or mistakes
  state: State // Card's state (New, Learning, Review, Relearning)
  last_review?: Date // Date of the last review (optional)
}

/** @deprecated Use DefaultSchedulerCardInput or the inferred card input of your custom scheduler. */
export interface CardInput extends Omit<Card, 'state' | 'due' | 'last_review'> {
  state: StateType | State // Card's state (New, Learning, Review, Relearning)
  due: DateInput // Due date
  last_review?: DateInput | null // Date of the last review (optional)
}

/** @deprecated Use the time type of the selected chrono; dateChrono requires valid Date objects. */
export type DateInput = Date | number | string

/**
 * (re)Learning steps:
 * [1m, 10m]
 * step1:again=1m hard=6m good=10m
 * step2(good): again=1m hard=10m
 *
 * [5m]
 * step1:again=5m hard=8m
 * step2(good): again=5m
 * step2(hard): again=5m hard=7.5m
 *
 * []
 * step: Managed by FSRS
 * @deprecated Use readonly StepUnit[] with learningSteps/relearningSteps config.
 */
export type Steps = StepUnit[] | readonly StepUnit[]

/** @deprecated Use the revlog input accepted by your scheduler's rollback method. */
export interface ReviewLogInput
  extends Omit<ReviewLog, 'rating' | 'state' | 'due' | 'review'> {
  rating: RatingType | Rating // Rating of the review (Again, Hard, Good, Easy)
  state: StateType | State // Card's state (New, Learning, Review, Relearning)
  due: DateInput // Due date
  review: DateInput // Date of the last review
}

/** @deprecated Use DefaultSchedulerOptions or the inferred config input of your custom scheduler. */
export interface FSRSParameters {
  request_retention: number
  maximum_interval: number
  w: number[] | readonly number[]
  enable_fuzz: boolean
  /**
   * When enable_short_term = false, the (re)learning steps are not applied.
   */
  enable_short_term: boolean
  learning_steps: Steps
  relearning_steps: Steps
}

/** @deprecated Use ModelReview from ts-fsrs, with rating and deltaT. */
export interface FSRSReview {
  /**
   * 0-4: Manual, Again, Hard, Good, Easy
   * = revlog.rating
   */
  rating: Grade
  /**
   * The number of days that passed
   * = round(revlog[-1].review - revlog[-2].review)
   */
  deltaT: number
}

/** @deprecated Use RescheduleReview from ts-fsrs/reschedule, with rating and reviewTime. */
export type FSRSHistory = Partial<Omit<ReviewLog, 'rating' | 'review'>> &
  (
    | {
        rating: Grade
        review: DateInput | Date
      }
    | {
        rating: typeof Rating.Manual
        due: DateInput | Date
        state: State
        review: DateInput | Date
      }
  )
