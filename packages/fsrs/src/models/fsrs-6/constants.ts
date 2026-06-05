import type { ModelBounds } from '../../kit'

export const FSRS6_DECAY = 0.1542
export const FSRS6_W17_W18_CEILING = 2.0
export const INIT_S_MAX = 100.0

export const FSRS6_MODEL_BOUNDS: ModelBounds = Object.freeze({
  sMin: 0.001,
  sMax: 36500.0,
  dMin: 1.0,
  dMax: 10.0,
})

export const FSRS6_DEFAULT_WEIGHTS = Object.freeze([
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
  FSRS6_DECAY,
]) as number[]

export const FSRS6ParameterBounds = (
  w17W18Ceiling: number,
  enableShortTerm = true
): [number, number][] => [
  [FSRS6_MODEL_BOUNDS.sMin, INIT_S_MAX],
  [FSRS6_MODEL_BOUNDS.sMin, INIT_S_MAX],
  [FSRS6_MODEL_BOUNDS.sMin, INIT_S_MAX],
  [FSRS6_MODEL_BOUNDS.sMin, INIT_S_MAX],
  [FSRS6_MODEL_BOUNDS.dMin, FSRS6_MODEL_BOUNDS.dMax],
  [0.001, 4.0],
  [0.001, 4.0],
  [0.001, 0.75],
  [0.0, 4.5],
  [0.0, 0.8],
  [0.001, 3.5],
  [0.001, 5.0],
  [0.001, 0.25],
  [0.001, 0.9],
  [0.0, 4.0],
  [0.0, 1.0],
  [1.0, 6.0],
  [0.0, w17W18Ceiling],
  [0.0, w17W18Ceiling],
  [enableShortTerm ? 0.01 : 0.0, 0.8],
  [0.1, 0.8],
]
