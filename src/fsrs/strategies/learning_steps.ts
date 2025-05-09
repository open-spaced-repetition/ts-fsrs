import { FSRSParameters, Rating, State, StepUnit, timeUnit } from '../models'
import { TLearningStepsStrategy } from './types'

export const ConvertStepUnitToMinutes = (step: StepUnit): number => {
  const unit = step.slice(-1) as timeUnit
  const value = parseInt(step.slice(0, -1), 10)
  if (isNaN(value) || !Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid step value: ${step}`)
  }
  switch (unit) {
    case 'm':
      return value
    case 'h':
      return value * 60
    case 'd':
      return value * 1440
    default:
      throw new Error(`Invalid step unit: ${step}, expected m/h/d`)
  }
}

export const BasicLearningStepsStrategy: TLearningStepsStrategy = (
  params: FSRSParameters,
  state: State,
  cur_step: number
) => {
  const learning_steps =
    state === State.Relearning || state === State.Review
      ? params.relearning_steps
      : params.learning_steps
  const steps_length = learning_steps.length
  // steps_length === 0 ,return empty object
  if (steps_length === 0 || cur_step >= steps_length) return {}

  // steps_length > 0
  const firstStep = learning_steps[0]

  const toMinutes = ConvertStepUnitToMinutes

  const getAgainInterval = (): number => {
    return toMinutes(firstStep)
  }

  const getHardInterval = (): number => {
    // steps_length > 0,return firstStep*1.5
    if (steps_length === 1) return Math.round(toMinutes(firstStep) * 1.5)
    // steps_length > 1,return (firstStep+nextStep)/2
    const nextStep = learning_steps[1]
    return Math.round((toMinutes(firstStep) + toMinutes(nextStep)) / 2)
  }

  const getStepInfo = (index: number) => {
    if (index < 0 || index >= steps_length) {
      return null
    } else {
      return learning_steps[index]
    }
  }

  const getGoodMinutes = (step: StepUnit): number | null => {
    return toMinutes(step)
  }

  const result: ReturnType<TLearningStepsStrategy> = {}
  const step_info = getStepInfo(Math.max(0, cur_step))
  // review -> again
  // new, learning, relearning -> again,hard,good(if next step exists)
  if (state === State.Review) {
    // review
    result[Rating.Again] = {
      scheduled_minutes: toMinutes(step_info!),
      next_step: 0,
    }
    return result
  } else {
    // new,learning, relearning
    result[Rating.Again] = {
      scheduled_minutes: getAgainInterval(),
      next_step: 0,
    }

    result[Rating.Hard] = {
      scheduled_minutes: getHardInterval(),
      next_step: cur_step,
    }
    const next_info = getStepInfo(cur_step + 1)
    if (next_info) {
      const nextMin = getGoodMinutes(next_info)

      if (nextMin) {
        result[Rating.Good] = {
          scheduled_minutes: Math.round(nextMin),
          next_step: cur_step + 1,
        }
      }
    }
  }
  return result
}
