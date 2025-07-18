export type StateType = 'New' | 'Learning' | 'Review' | 'Relearning'

export enum State {
  New = 0,
  Learning = 1,
  Review = 2,
  Relearning = 3,
}

export type RatingType = 'Manual' | 'Again' | 'Hard' | 'Good' | 'Easy'

export enum Rating {
  Manual = 0,
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4,
}

export type GradeType = Exclude<RatingType, 'Manual'>
export type Grade = Exclude<Rating, Rating.Manual>

export interface ReviewLog {
  rating: Rating // Rating of the review (Again, Hard, Good, Easy)
  state: State // State of the review (New, Learning, Review, Relearning)
  due: Date // Date of the last scheduling
  stability: number // Memory stability during the review
  difficulty: number // Difficulty of the card during the review
  /**
   * @deprecated This field will be removed in version 6.0.0
   */
  elapsed_days: number // Number of days elapsed since the last review
  /**
   * @deprecated This field will be removed in version 6.0.0
   */
  last_elapsed_days: number // Number of days between the last two reviews
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
  /**
   * @deprecated This field will be removed in version 6.0.0
   */
  elapsed_days: number // Number of days elapsed
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
export type TimeUnit = 'm' | 'h' | 'd'
export type StepUnit = `${number}${TimeUnit}`
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
 *
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
  rating: Rating
  /**
   * The number of days that passed
   * = revlog.elapsed_days
   * = round(revlog[-1].review - revlog[-2].review)
   */
  delta_t: number
}

export type FSRSHistory = Partial<
  Omit<ReviewLog, 'rating' | 'review' | 'elapsed_days'> & { review_duration?: number } // optional review_duration
> &
  (
    | {
        rating: Grade
        review: DateInput | Date
      }
    | {
        rating: Rating.Manual
        due: DateInput | Date
        state: State
        review: DateInput | Date
      }
  )

/**
 * Represents the memory state of a card. Can be generic to support
 * both standard numbers and tensors for optimization.
 */
export interface FSRSState<T = number> {
  stability: T
  difficulty: T
}
