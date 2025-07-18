import { version } from '../../package.json'
import type { StepUnit } from './models'

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

export const S_MIN = 0.001
export const S_MAX = 36500.0
export const INIT_S_MAX = 100.0
export const FSRS5_DEFAULT_DECAY = 0.5
export const FSRS6_DEFAULT_DECAY = 0.1542
export const default_w = Object.freeze([
  0.212,
  1.2931,
  2.3065,
  8.2956,
  6.4133,
  0.8334,
  3.0194,
  0.001,
  1.8722,
  0.1666,
  0.796,
  1.4835,
  0.0614,
  0.2629,
  1.6483,
  0.6014,
  1.8729,
  0.5425,
  0.0912,
  0.0658,
  FSRS6_DEFAULT_DECAY,
]) satisfies readonly number[]

export const DEFAULT_PARAMS_STDDEV_TENSOR = Object.freeze([
  6.43,
  9.66,
  17.58,
  27.85,
  0.57,
  0.28,
  0.6,
  0.12,
  0.39,
  0.18,
  0.33,
  0.3,
  0.09,
  0.16,
  0.57,
  0.25,
  1.03,
  0.31,
  0.32,
  0.14,
  0.27,
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
