import type { StandardSchemaV1 } from '@standard-schema/spec'
import * as z from 'zod/mini'

export const State = {
  New: 0,
  Learning: 1,
  Review: 2,
  Relearning: 3,
} as const

export type State = (typeof State)[keyof typeof State]

export const states = [
  State.New,
  State.Learning,
  State.Review,
  State.Relearning,
] as const satisfies readonly State[]

export const stateSchema = z.literal(states) satisfies StandardSchemaV1<
  State,
  State
>
