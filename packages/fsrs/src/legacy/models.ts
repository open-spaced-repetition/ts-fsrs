import type { Grade, Rating, State } from '@open-spaced-repetition/srs-kit'
import type { StepUnit } from '../middlewares/learning-steps/types.js'

export { type Grade, Rating, State } from '@open-spaced-repetition/srs-kit'

export type StateType = keyof typeof State
export type RatingType = keyof typeof Rating
export type GradeType = Exclude<RatingType, 'Manual'>

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

export type RecordLogItem = {
  card: Card
  log: ReviewLog
}

export type RecordLog = {
  [key in Grade]: RecordLogItem
}

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

export interface CardInput extends Omit<Card, 'state' | 'due' | 'last_review'> {
  state: StateType | State // Card's state (New, Learning, Review, Relearning)
  due: DateInput // Due date
  last_review?: DateInput | null // Date of the last review (optional)
}

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
 */
export type Steps = StepUnit[] | readonly StepUnit[]

export interface ReviewLogInput
  extends Omit<ReviewLog, 'rating' | 'state' | 'due' | 'review'> {
  rating: RatingType | Rating // Rating of the review (Again, Hard, Good, Easy)
  state: StateType | State // Card's state (New, Learning, Review, Relearning)
  due: DateInput // Due date
  review: DateInput // Date of the last review
}

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
