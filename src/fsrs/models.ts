export type StateType = "New" | "Learning" | "Review" | "Relearning";

export enum State {
  New = 0,
  Learning = 1,
  Review = 2,
  Relearning = 3,
}

export type RatingType = "Manual" | "Again" | "Hard" | "Good" | "Easy";

export enum Rating {
  Manual = 0,
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4,
}

type ExcludeManual<T> = Exclude<T, Rating.Manual>;

export type Grade = ExcludeManual<Rating>;

export interface ReviewLog {
  rating: Rating; // Rating of the review (Again, Hard, Good, Easy)
  state: State; // State of the review (New, Learning, Review, Relearning)
  due: Date;  // Date of the last scheduling
  stability: number; // Memory stability during the review
  difficulty: number; // Difficulty of the card during the review
  elapsed_days: number; // Number of days elapsed since the last review
  last_elapsed_days: number; // Number of days between the last two reviews
  scheduled_days: number; // Number of days until the next review
  review: Date; // Date of the review
}
export type RecordLogItem = {
  card: Card; log: ReviewLog
}
export type RecordLog = {
  [key in Grade]: RecordLogItem;
};

export interface Card {
  due: Date; // Due date
  stability: number; // Stability
  difficulty: number; // Difficulty level
  elapsed_days: number; // Number of days elapsed
  scheduled_days: number; // Number of days scheduled
  reps: number; // Repetition count
  lapses: number; // Number of lapses or mistakes
  state: State; // Card's state (New, Learning, Review, Relearning)
  last_review?: Date; // Date of the last review (optional)
}

export type CardInput = Card & { state: StateType | State };
export type DateInput = Date | number | string;
export type ReviewLogInput = ReviewLog & {
  rating: RatingType | Rating;
  state: StateType | State;
};

export interface FSRSParameters {
  request_retention: number;
  maximum_interval: number;
  w: number[];
  enable_fuzz: boolean;
}
