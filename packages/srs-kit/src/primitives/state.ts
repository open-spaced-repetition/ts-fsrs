import { defineSchema } from '@/schema/index.js'

export const State = Object.freeze({
  New: 0,
  Learning: 1,
  Review: 2,
  Relearning: 3,
} as const)

export const states = Object.freeze([
  State.New,
  State.Learning,
  State.Review,
  State.Relearning,
] as const)

export type State = (typeof states)[number]

export const stateSchema = defineSchema<State>((value) =>
  value === State.New ||
  value === State.Learning ||
  value === State.Review ||
  value === State.Relearning
    ? { value }
    : { issues: [{ message: 'Expected state' }] }
)
