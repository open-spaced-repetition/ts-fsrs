import { clamp } from '../../help'
import {
  FSRS4Dot5ParameterBounds
} from './constants.js'

export const clipFSRS4Dot5Parameters = (parameters: number[]): number[] => {
  const clip = FSRS4Dot5ParameterBounds().slice(0, parameters.length)
  return clip.map(([min, max], index) =>
    clamp(parameters[index] || 0, min, max)
  )
}
