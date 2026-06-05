import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { FSRSReview, FSRSState, Rating } from '../models'
import type { Prettify, SchemaOutput } from './helper-types'

export interface ModelBounds {
  sMin: number
  sMax: number
  dMin: number
  dMax: number
}

// Shared base for every model's config. Model-specific fields (e.g.
// enableShortTerm, which FSRS-4 does not use) live in each model's own schema.
export interface FSRSModelConfig extends Record<string, unknown> {
  weights: number[]
}

export interface FSRSStepInput {
  memoryState: FSRSState | null
  rating: Rating
  elapsedDays: number
  retrievability?: number
}

export interface FSRSForwardInput {
  history: FSRSReview[]
  initialState?: FSRSState | null
}

export interface IFSRSModel<
  Config extends
    StandardSchemaV1<FSRSModelConfig> = StandardSchemaV1<FSRSModelConfig>,
> {
  // Validated config (the schema's output slot).
  readonly config: Readonly<Prettify<SchemaOutput<Config>>>
  // Vendor-neutral schema (input/output slots); consumers validate/infer themselves.
  readonly '~configSchema': Config
  readonly bounds: Readonly<ModelBounds>
  readonly step: (input: FSRSStepInput) => FSRSState
  readonly nextInterval: (
    memoryState: FSRSState,
    desiredRetention: number
  ) => number
  readonly forgettingCurve: (
    memoryState: FSRSState,
    elapsedDays: number
  ) => number
  readonly forward: (input: FSRSForwardInput) => FSRSState[]
}
