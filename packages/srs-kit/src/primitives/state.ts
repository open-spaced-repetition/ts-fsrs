import type { StandardSchemaV1 } from '@/schema/index.js'

export const State = Object.freeze({
  New: 0,
  Learning: 1,
  Review: 2,
  Relearning: 3,
} as const)

export type State = (typeof State)[keyof typeof State]

export const states = Object.freeze([
  State.New,
  State.Learning,
  State.Review,
  State.Relearning,
] as const) satisfies readonly State[]

export const stateSchema: StandardSchemaV1<State, State> = {
  '~standard': {
    version: 1,
    vendor: '@open-spaced-repetition/srs-kit',
    validate(value) {
      return value === State.New ||
        value === State.Learning ||
        value === State.Review ||
        value === State.Relearning
        ? { value }
        : { issues: [{ message: 'Expected state' }] }
    },
  },
}
