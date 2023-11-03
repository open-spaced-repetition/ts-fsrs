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
  FSRS_W: process.env.FSRS_W
    ? JSON.parse(process.env.FSRS_W as string)
    : undefined,
  FSRS_ENABLE_FUZZ: Boolean(process.env.FSRS_ENABLE_FUZZ),
};

export const default_request_retention = !isNaN(
  envParams.FSRS_REQUEST_RETENTION,
)
  ? envParams.FSRS_REQUEST_RETENTION
  : 0.9;
export const default_maximum_interval = !isNaN(envParams.FSRS_MAXIMUM_INTERVAL)
  ? envParams.FSRS_MAXIMUM_INTERVAL
  : 36500;
export const default_w = envParams.FSRS_W || [
  0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05,
  0.34, 1.26, 0.29, 2.61,
];
export const default_enable_fuzz = envParams.FSRS_ENABLE_FUZZ || false;

export const FSRSVersion: string = "3.0.5";

export const generatorParameters = (props?: Partial<FSRSParameters>): FSRSParameters => {
  return {
    request_retention: props?.request_retention || default_request_retention,
    maximum_interval: props?.maximum_interval || default_maximum_interval,
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
    last_review: undefined,
  };
};

export const fsrs = (params?: Partial<FSRSParameters>): FSRS => {
  return new FSRS(params || {});
};
