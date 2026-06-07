import type { FSRSReview, FSRSState, Rating } from '../models'
import type { Prettify } from './helper-types'

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

export interface FSRSStepInput<MemoryState extends FSRSState = FSRSState> {
  memoryState: MemoryState | null
  rating: Rating
  elapsedDays: number
  retrievability?: number
}

export interface FSRSForwardInput<MemoryState extends FSRSState = FSRSState> {
  history: FSRSReview[]
  initialState?: MemoryState | null
}

export interface IFSRSModel<
  Config extends object = FSRSModelConfig,
  MemoryState extends FSRSState = FSRSState,
> {
  readonly config: Readonly<Prettify<Config>>
  readonly bounds: Readonly<ModelBounds>
  readonly step: (input: FSRSStepInput<MemoryState>) => MemoryState
  readonly nextInterval: (
    memoryState: MemoryState,
    desiredRetention: number
  ) => number
  readonly forgettingCurve: (
    memoryState: MemoryState,
    elapsedDays: number
  ) => number
  readonly forward: (input: FSRSForwardInput<MemoryState>) => MemoryState[]
}
