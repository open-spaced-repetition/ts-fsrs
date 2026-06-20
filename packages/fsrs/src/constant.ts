import { version } from '../package.json'
import type { StepUnit } from './models'
import { FSRS5_DECAY } from './models/fsrs-5/constants.js'
import {
  FSRS6_DECAY,
  FSRS6_DEFAULT_WEIGHTS,
  INIT_S_MAX as FSRS6_INIT_S_MAX,
  FSRS6_MODEL_BOUNDS,
  FSRS6_W17_W18_CEILING,
  FSRS6ParameterBounds,
} from './models/fsrs-6/constants.js'

export const default_request_retention = 0.9
export const default_maximum_interval = 36500
export const default_enable_fuzz = false
export const default_enable_short_term = true
export const default_learning_steps: readonly StepUnit[] = Object.freeze([
  '1m',
  '10m',
]) // New->Learning,Learning->Learning

export const default_relearning_steps: readonly StepUnit[] = Object.freeze([
  '10m',
]) // Relearning->Relearning

export const FSRSVersion: string = `v${version} using FSRS-6.0`

export const S_MIN = FSRS6_MODEL_BOUNDS.stabilityMin
export const S_MAX = FSRS6_MODEL_BOUNDS.stabilityMax
export const INIT_S_MAX = FSRS6_INIT_S_MAX
export {
  FSRS5_DECAY as FSRS5_DEFAULT_DECAY,
  FSRS6_DECAY as FSRS6_DEFAULT_DECAY,
}
export const default_w = FSRS6_DEFAULT_WEIGHTS

export const W17_W18_Ceiling = FSRS6_W17_W18_CEILING
export const CLAMP_PARAMETERS = FSRS6ParameterBounds
