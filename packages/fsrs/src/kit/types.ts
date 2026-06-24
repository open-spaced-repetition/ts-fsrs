import type { ModelCore } from '@open-spaced-repetition/srs-kit/model'
import type { FSRSState } from '../models'

/** @internal */
export type IFSRSModel = ModelCore<{
  readonly memoryState: FSRSState
}>
