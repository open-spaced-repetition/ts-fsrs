export type StateType = "New" | "Learning" | "Review" | "Relearning";

export enum State {
  New = 0,
  Learning,
  Review,
  Relearning,
}

export type RatingType = "Again" | "Hard" | "Good" | "Easy";

export enum Rating {
  Again = 1,
  Hard,
  Good,
  Easy,
}

export interface ReviewLog {
  rating: Rating;
  state: State;
  elapsed_days: number;
  scheduled_days: number;
  review: Date;
}

export type RecordLog = {
  [key in Rating]: { card: Card; log: ReviewLog };
};

export interface Card {
  due: Date;
  stability: number; // 稳定性
  difficulty: number; //难度
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: State;
  last_review?: Date;
}

export type CardInput = Card & { state: StateType | State };
export type DateInput = Date | number | string;

export interface FSRSParameters {
  request_retention: number;
  maximum_interval: number;
  w: number[];
  enable_fuzz: boolean;
}
