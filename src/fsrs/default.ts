import { Card, FSRSParameters, State, FSRS } from "./index";

export const default_request_retention = 0.9;
export const default_maximum_interval = 36500;
export const default_easy_bonus = 1.3;
export const default_hard_factor = 1.2;
export const default_w = [
  1, 1, 5, -0.5, -0.5, 0.2, 1.4, -0.12, 0.8, 2, -0.2, 0.2, 1,
];
export const default_enable_fuzz = false;

export const FSRSVersion: string = "2.1.1";

export const generatorParameters = (props?: Partial<FSRSParameters>) => {
  return {
    request_retention: props?.request_retention || default_request_retention,
    maximum_interval: props?.maximum_interval || default_maximum_interval,
    easy_bonus: props?.easy_bonus || default_easy_bonus,
    hard_factor: props?.hard_factor || default_hard_factor,
    w: props?.w || default_w,
    enable_fuzz: props?.enable_fuzz || default_enable_fuzz,
  };
};

export const createEmptyCard = (now?: Date): Card => {
  return {
    due: now || new Date(),
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    state: State.New,
  };
};

export const fsrs = (params?: Partial<FSRSParameters>) => {
  return new FSRS(params || {});
};
