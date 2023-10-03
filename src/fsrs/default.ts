import { Card, FSRSParameters, State, FSRS } from "./index";
import dotenv from "dotenv";
import { EnvParams } from "./type";

dotenv.config({ path: `./.env.local` });
dotenv.config({ path: `./.env.production` });
dotenv.config({ path: `./.env.` });
dotenv.config({ path: `./.env.development` });

export const envParams: EnvParams = {
  FSRS_REQUEST_RETENTION: Number(process.env.FSRS_REQUEST_RETENTION),
  FSRS_MAXIMUM_INTERVAL: Number(process.env.FSRS_MAXIMUM_INTERVAL),
  FSRS_EASY_BOUND: Number(process.env.FSRS_EASY_BOUND),
  FSRS_HARD_FACTOR: Number(process.env.FSRS_HARD_FACTOR),
  FSRS_W: process.env.FSRS_W
    ? JSON.parse(process.env.FSRS_W as string)
    : undefined,
  FSRS_ENABLE_FUZZ: Boolean(process.env.FSRS_ENABLE_FUZZ),
};

export const default_request_retention = !isNaN(envParams.FSRS_REQUEST_RETENTION)
  ? envParams.FSRS_REQUEST_RETENTION
  : 0.9;
export const default_maximum_interval = !isNaN(envParams.FSRS_MAXIMUM_INTERVAL)
  ? envParams.FSRS_MAXIMUM_INTERVAL
  : 36500;
export const default_easy_bonus = !isNaN(envParams.FSRS_EASY_BOUND)
  ? envParams.FSRS_EASY_BOUND
  : 1.3;
export const default_hard_factor = !isNaN(envParams.FSRS_HARD_FACTOR)
  ? envParams.FSRS_HARD_FACTOR
  : 1.2;
export const default_w = envParams.FSRS_W || [
  1, 1, 5, -0.5, -0.5, 0.2, 1.4, -0.12, 0.8, 2, -0.2, 0.2, 1,
];
export const default_enable_fuzz = envParams.FSRS_ENABLE_FUZZ || false;

export const FSRSVersion: string = "2.2.0";

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
