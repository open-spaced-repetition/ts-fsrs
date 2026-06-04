import { clamp } from '../../help.js'
import { FSRS2ParameterBounds } from './constants.js'

export const clipFSRS2Parameters = (parameters: number[]): number[] => {
  const clip = FSRS2ParameterBounds().slice(0, parameters.length)
  return clip.map(([min, max], index) =>
    clamp(parameters[index] ?? 0, min, max)
  )
}
