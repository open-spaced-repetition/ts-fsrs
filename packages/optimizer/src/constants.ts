export const S_MIN = 0.001
export const S_MAX = 36500.0
export const INIT_S_MAX = 100.0
export const D_MIN = 1.0
export const D_MAX = 10.0
export const FSRS6_DEFAULT_DECAY = 0.1542

export const DEFAULT_PARAMETERS = Object.freeze([
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

export const PARAMS_STDDEV = Object.freeze([
  6.43, 9.66, 17.58, 27.85, 0.57, 0.28, 0.6, 0.12, 0.39, 0.18, 0.33, 0.3, 0.09,
  0.16, 0.57, 0.25, 1.03, 0.31, 0.32, 0.14, 0.27,
]) satisfies readonly number[]

export const DEFAULT_NUM_EPOCHS = 5
export const DEFAULT_BATCH_SIZE = 512
export const DEFAULT_SEED = 2023
export const DEFAULT_LEARNING_RATE = 4e-2
export const DEFAULT_MAX_SEQ_LEN = 64
export const DEFAULT_GAMMA = 1.0
export const DEFAULT_BETA1 = 0.9
export const DEFAULT_BETA2 = 0.999
export const DEFAULT_ADAM_EPSILON = 1e-8
export const DEFAULT_PROGRESS_TIMEOUT = 500
export const DEFAULT_GRADIENT_EPSILON = 1e-4
export const DEFAULT_NEXT_DAY_STARTS_AT = 4
export const DEFAULT_TIMEZONE = 'Asia/Shanghai'

export const W17_W18_CEILING = 2.0
export const BCE_EPSILON = 1e-12
