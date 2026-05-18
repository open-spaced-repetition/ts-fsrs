import {
  D_MAX,
  D_MIN,
  DEFAULT_PARAMETERS,
  INIT_S_MAX,
  S_MIN,
} from './constants'
import { clamp } from './utils'

const W17_W18_CEILING = 2.0

export const clipParameters = (
  parameters: readonly number[],
  numRelearningSteps: number,
  enableShortTerm: boolean
) => {
  const clipped = Array.from(parameters)
  const w11 = clamp(clipped[11] ?? DEFAULT_PARAMETERS[11], 0.001, 5.0)
  const w13 = clamp(clipped[13] ?? DEFAULT_PARAMETERS[13], 0.001, 0.9)
  const w14 = clamp(clipped[14] ?? DEFAULT_PARAMETERS[14], 0.0, 4.0)
  const w17w18Ceiling =
    numRelearningSteps > 1
      ? clamp(
          Math.sqrt(
            Math.max(
              0.01,
              -(
                Math.log(w11) +
                Math.log(Math.pow(2.0, w13) - 1.0) +
                w14 * 0.3
              ) / numRelearningSteps
            )
          ),
          0.01,
          W17_W18_CEILING
        )
      : W17_W18_CEILING
  const w19Floor = enableShortTerm ? 0.01 : 0.0

  const clamps: Array<[number, number]> = [
    [S_MIN, INIT_S_MAX],
    [S_MIN, INIT_S_MAX],
    [S_MIN, INIT_S_MAX],
    [S_MIN, INIT_S_MAX],
    [D_MIN, D_MAX],
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
    [0.0, w17w18Ceiling],
    [0.0, w17w18Ceiling],
    [w19Floor, 0.8],
    [0.1, 0.8],
  ]

  return clipped.map((parameter, index) =>
    clamp(parameter, clamps[index][0], clamps[index][1])
  )
}
