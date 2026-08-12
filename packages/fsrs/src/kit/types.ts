import type { ModelCore } from '@open-spaced-repetition/srs-kit/model'
import type { FSRS6Algorithm } from '../models/fsrs-6/algorithm.js'

export interface FSRSState {
  stability: number
  difficulty: number
}

/** @internal */
export type IFSRSModel = ModelCore<{
  readonly memoryState: FSRSState
  readonly algorithm: FSRS6Algorithm
}>
