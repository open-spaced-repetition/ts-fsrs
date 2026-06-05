// Forces TS to expand a type into its resolved object shape (better hover/errors).
export type Prettify<T> = { [K in keyof T]: T[K] } & {}
