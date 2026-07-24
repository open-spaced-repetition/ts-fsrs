import type { ModelCore } from '@open-spaced-repetition/srs-kit/model'
import type { FSRSState } from '../models'
import type { FSRS6Algorithm } from '../models/fsrs-6/algorithm.js'

/** @internal */
export type IFSRSModel = ModelCore<{
  readonly memoryState: FSRSState
  readonly algorithm: FSRS6Algorithm
}>
