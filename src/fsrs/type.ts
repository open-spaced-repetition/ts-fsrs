export type unit = "days" | "minutes";
export type int = number & { __int__: void };
export type double = number & { __double__: void };

export interface EnvParams{
    FSRS_REQUEST_RETENTION:number,
    FSRS_MAXIMUM_INTERVAL:number,
    FSRS_W?:number[],
    FSRS_ENABLE_FUZZ?:boolean
}