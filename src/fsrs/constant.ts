import { version } from '../../package.json'

export const default_request_retention = 0.9
export const default_maximum_interval = 36500
export const default_enable_fuzz = false
export const default_enable_short_term = true
export const default_num_learning_steps = 2 // New->Learning,Learning->Learning
export const default_num_relearning_steps = 1 // Relearning->Relearning

export const FSRSVersion: string = `v${version} using FSRS-5.0`

export const S_MIN = 0.001
export const S_MAX = 36500.0
export const INIT_S_MAX = 100.0
export const FSRS5_DEFAULT_DECAY = 0.5
export const FSRS6_DEFAULT_DECAY = 0.2
export const default_w = Object.freeze([
  0.2172,
  1.1771,
  3.2602,
  16.1507,
  7.0114,
  0.57,
  2.0966,
  0.0069,
  1.5261,
  0.112,
  1.0178,
  1.849,
  0.1133,
  0.3127,
  2.2934,
  0.2191,
  3.0004,
  0.7536,
  0.3332,
  0.1437,
  FSRS6_DEFAULT_DECAY,
]) satisfies readonly number[]

export const W17_W18_Ceiling = 2.0
export const CLAMP_PARAMETERS = (w17_w18_ceiling: number) => [
  [S_MIN, INIT_S_MAX] /** initial stability (Again) */,
  [S_MIN, INIT_S_MAX] /** initial stability (Hard) */,
  [S_MIN, INIT_S_MAX] /** initial stability (Good) */,
  [S_MIN, INIT_S_MAX] /** initial stability (Easy) */,
  [1.0, 10.0] /** initial difficulty (Good) */,
  [0.001, 4.0] /** initial difficulty (multiplier) */,
  [0.001, 4.0] /** difficulty (multiplier) */,
  [0.001, 0.75] /** difficulty (multiplier) */,
  [0.0, 4.5] /** stability (exponent) */,
  [0.0, 0.8] /** stability (negative power) */,
  [0.001, 3.5] /** stability (exponent) */,
  [0.001, 5.0] /** fail stability (multiplier) */,
  [0.001, 0.25] /** fail stability (negative power) */,
  [0.001, 0.9] /** fail stability (power) */,
  [0.0, 4.0] /** fail stability (exponent) */,
  [0.0, 1.0] /** stability (multiplier for Hard) */,
  [1.0, 6.0] /** stability (multiplier for Easy) */,
  [0.0, w17_w18_ceiling] /** short-term stability (exponent) */,
  [0.0, w17_w18_ceiling] /** short-term stability (exponent) */,
  [0.0, 0.8] /** short-term last-stability (exponent) */,
  [0.1, 0.8] /** decay */,
]
