import FSRS from "./fsrs";
import {
    Card, default_easy_bonus, default_enable_fuzz, default_hard_factor, default_maximum_interval,
    default_request_retention, default_w,
    FSRSParameters,
    Rating,
    RatingType,
    ReviewLog,
    SchedulingLog,
    State,
    StateType,
} from "./models";
import {SchedulingCard} from "./scheduler";

const fsrs = (param?: FSRSParameters) => {
    return new FSRS(param)
}

const createEmptyCard = (): Card => {
    return {
        due: new Date(),
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        reps: 0,
        lapses: 0,
        state: State.New,
    }
}

const generatorParameters = (props?: {
    request_retention?: number;
    maximum_interval?: number;
    easy_bonus?: number;
    hard_factor?: number;
    w?: number[];
    enable_fuzz?: boolean;
}) => {
    if (!props) {
        return {
            request_retention: default_request_retention,
            maximum_interval: default_maximum_interval,
            easy_bonus: default_easy_bonus,
            hard_factor: default_hard_factor,
            w: default_w,
            enable_fuzz: default_enable_fuzz,
        };
    }
    const {w, request_retention, hard_factor, maximum_interval, enable_fuzz, easy_bonus} = props;
    return {
        request_retention: request_retention || default_request_retention,
        maximum_interval: maximum_interval || default_maximum_interval,
        easy_bonus: easy_bonus || default_easy_bonus,
        hard_factor: hard_factor || default_hard_factor,
        w: w || default_w,
        enable_fuzz: enable_fuzz || default_enable_fuzz,
    };
};

const FSRS_Version = 1.20;
export {fsrs, FSRS_Version, State, Rating, SchedulingCard, createEmptyCard, generatorParameters};
export type {StateType, RatingType, ReviewLog, Card, SchedulingLog, FSRSParameters};
export {
    default_request_retention,
    default_maximum_interval,
    default_easy_bonus,
    default_hard_factor,
    default_w,
    default_enable_fuzz
}