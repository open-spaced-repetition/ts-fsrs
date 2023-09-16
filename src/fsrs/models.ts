export type StateType = "Learning" | "New" | "Review" | "Relearning";

export enum State {
  New,
  Learning,
  Review,
  Relearning,
}

export type RatingType = "Again" | "Hard" | "Good" | "Easy";

export enum Rating {
  Again,
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

export interface SchedulingLog {
  [key: number]: {
    card: Card;
    log: ReviewLog;
  };
}

export interface FSRSParameters {
  request_retention: number;
  maximum_interval: number;
  easy_bonus: number;
  hard_factor: number;
  w: number[];
  enable_fuzz: boolean;
}

export const default_request_retention = 0.9;
export const default_maximum_interval = 36500;
export const default_easy_bonus = 1.3;
export const default_hard_factor = 1.2;
export const default_w = [
  1, 1, 5, -0.5, -0.5, 0.2, 1.4, -0.12, 0.8, 2, -0.2, 0.2, 1,
];
export const default_enable_fuzz = false;
