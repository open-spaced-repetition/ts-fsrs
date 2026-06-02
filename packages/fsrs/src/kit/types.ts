import type { FSRSReview, FSRSState, Rating } from '../models'

export interface ModelBounds {
  sMin: number
  sMax: number
  dMin: number
  dMax: number
}

export interface FSRSModelConfig extends Record<string, unknown> {
  weights: number[]
  enableShortTerm: boolean
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

export interface IFSRSModel<Config extends FSRSModelConfig = FSRSModelConfig> {
  readonly config: Readonly<Config>
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
