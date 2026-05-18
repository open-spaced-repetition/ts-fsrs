import {
  BCE_EPSILON,
  D_MAX,
  D_MIN,
  DEFAULT_PARAMETERS,
  S_MAX,
  S_MIN,
} from './constants'
import type { FSRSItem, MemoryState, PreparedTrainingItem } from './types'
import { clamp } from './utils'

export function powerForgettingCurve(
  parameters: readonly number[],
  elapsedDays: number,
  stability: number
): number {
  const decay = -parameters[20]
  const factor = Math.exp(Math.log(0.9) / decay) - 1.0
  return Math.pow(1 + (elapsedDays / stability) * factor, decay)
}

export function initDifficulty(
  parameters: readonly number[],
  rating: number
): number {
  return parameters[4] - Math.exp(parameters[5] * (rating - 1)) + 1
}

function initStability(parameters: readonly number[], rating: number): number {
  return parameters[rating - 1]
}

function nextDifficulty(
  parameters: readonly number[],
  difficulty: number,
  rating: number
): number {
  const deltaDifficulty = -parameters[6] * (rating - 3)
  const updated = difficulty + linearDamping(deltaDifficulty, difficulty)
  return clamp(meanReversion(parameters, updated), D_MIN, D_MAX)
}

function meanReversion(
  parameters: readonly number[],
  newDifficulty: number
): number {
  return (
    parameters[7] * (initDifficulty(parameters, 4) - newDifficulty) +
    newDifficulty
  )
}

function linearDamping(deltaDifficulty: number, oldDifficulty: number): number {
  return ((10 - oldDifficulty) * deltaDifficulty) / 9
}

function stabilityAfterSuccess(
  parameters: readonly number[],
  lastStability: number,
  lastDifficulty: number,
  retrievability: number,
  rating: number
): number {
  const hardPenalty = rating === 2 ? parameters[15] : 1
  const easyBonus = rating === 4 ? parameters[16] : 1
  return (
    lastStability *
    (Math.exp(parameters[8]) *
      (11 - lastDifficulty) *
      Math.pow(lastStability, -parameters[9]) *
      (Math.exp((1 - retrievability) * parameters[10]) - 1) *
      hardPenalty *
      easyBonus +
      1)
  )
}

function stabilityAfterFailure(
  parameters: readonly number[],
  lastStability: number,
  lastDifficulty: number,
  retrievability: number
): number {
  const updated =
    parameters[11] *
    Math.pow(lastDifficulty, -parameters[12]) *
    (Math.pow(lastStability + 1, parameters[13]) - 1) *
    Math.exp((1 - retrievability) * parameters[14])
  const newStabilityMin =
    lastStability / Math.exp(parameters[17] * parameters[18])
  return Math.min(updated, newStabilityMin)
}

function stabilityShortTerm(
  parameters: readonly number[],
  lastStability: number,
  rating: number
): number {
  const sinc =
    Math.exp(parameters[17] * (rating - 3 + parameters[18])) *
    Math.pow(lastStability, -parameters[19])
  const masked = rating >= 2 ? Math.max(sinc, 1.0) : sinc
  return lastStability * masked
}

export function step(
  parameters: readonly number[],
  deltaT: number,
  rating: number,
  state: MemoryState,
  nth: number
): MemoryState {
  const lastStability = clamp(state.stability, S_MIN, S_MAX)
  const lastDifficulty = clamp(state.difficulty, D_MIN, D_MAX)

  if (rating === 0) {
    return {
      stability: lastStability,
      difficulty: lastDifficulty,
    }
  }

  const retrievability = powerForgettingCurve(parameters, deltaT, lastStability)

  let newStability =
    rating === 1
      ? stabilityAfterFailure(
          parameters,
          lastStability,
          lastDifficulty,
          retrievability
        )
      : stabilityAfterSuccess(
          parameters,
          lastStability,
          lastDifficulty,
          retrievability,
          rating
        )

  if (deltaT === 0) {
    newStability = stabilityShortTerm(parameters, lastStability, rating)
  }

  let newDifficulty = nextDifficulty(parameters, lastDifficulty, rating)

  if (nth === 0 && state.stability === 0) {
    newStability = initStability(parameters, clamp(rating, 1, 4))
    newDifficulty = clamp(
      initDifficulty(parameters, clamp(rating, 1, 4)),
      D_MIN,
      D_MAX
    )
  }

  return {
    stability: clamp(newStability, S_MIN, S_MAX),
    difficulty: clamp(newDifficulty, D_MIN, D_MAX),
  }
}

export function forwardItem(
  parameters: readonly number[],
  item: FSRSItem
): MemoryState {
  let state: MemoryState = { stability: 0, difficulty: 0 }
  const history = item.reviews.slice(0, -1)
  for (let index = 0; index < history.length; index++) {
    const review = history[index]
    state = step(parameters, review.deltaT, review.rating, state, index)
  }
  return state
}

export function predictRecall(
  parameters: readonly number[],
  item: FSRSItem
): number {
  const state = forwardItem(parameters, item)
  const current = item.current
  if (!current) {
    throw new Error('FSRS item must contain at least one review')
  }
  return powerForgettingCurve(parameters, current.deltaT, state.stability)
}

export function binaryCrossEntropy(
  probability: number,
  label: 0 | 1,
  weight: number
): number {
  const clipped = clamp(probability, BCE_EPSILON, 1 - BCE_EPSILON)
  return (
    -(label * Math.log(clipped) + (1 - label) * Math.log(1 - clipped)) * weight
  )
}

export function batchDataLoss(
  parameters: readonly number[],
  batch: readonly PreparedTrainingItem[]
): number {
  let total = 0
  for (const prepared of batch) {
    const state = forwardItem(parameters, prepared.item)
    const predicted = powerForgettingCurve(
      parameters,
      prepared.currentDeltaT,
      state.stability
    )
    total += binaryCrossEntropy(predicted, prepared.label, prepared.weight)
  }
  return total
}

export function l2Penalty(
  parameters: readonly number[],
  initialParameters: readonly number[],
  batchSize: number,
  totalSize: number,
  gamma: number,
  paramsStddev: readonly number[]
): number {
  let total = 0
  for (let index = 0; index < parameters.length; index++) {
    const delta = parameters[index] - initialParameters[index]
    total += (delta * delta) / (paramsStddev[index] * paramsStddev[index])
  }
  return total * gamma * (batchSize / totalSize)
}

export function defaultInitializationParameters(): number[] {
  return [...DEFAULT_PARAMETERS]
}
