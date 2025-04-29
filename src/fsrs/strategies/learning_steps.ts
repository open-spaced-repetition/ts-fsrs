import {
  FSRSParameters,
  Grade,
  GradeType,
  Rating,
  State,
  StepUnit,
  timeUnit,
} from '../models'
import { TLearningStepsStrategy } from './types'

export const ConvertStepUnitToMinutes = (step: StepUnit): number => {
  const unit = step.slice(-1) as timeUnit
  const value = parseInt(step.slice(0, -1), 10)
  if (isNaN(value)) {
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
      throw new Error(`Invalid step unit: ${step}`)
  }
}

export const DefaultLearningStepsStrategy: TLearningStepsStrategy = (
  params: FSRSParameters,
  state: State,
  cur_step: number
) => {
  const learning_steps =
    state === State.Relearning || state === State.Review
      ? params.relearning_steps
      : params.learning_steps
  const steps_length = learning_steps.length
  if (steps_length === 0 || cur_step >= steps_length) return {}

  const firstStep = learning_steps[0]

  const toMinutes = ConvertStepUnitToMinutes
  const getExtraStepInfo = (stepInfo: { [K in GradeType]?: StepUnit }) => {
    const result: { [K in Grade]?: number } = Object.create(null)
    for (const [k, v] of Object.entries(stepInfo)) {
      const minutes = toMinutes(v)
      const grade = Rating[k as GradeType]
      if (grade >= Rating.Again && grade <= Rating.Good) result[grade] = minutes
    }
    return result
  }

  const getAgainInterval = (): number => {
    return typeof firstStep === 'string'
      ? toMinutes(firstStep)
      : (getExtraStepInfo(firstStep)[Rating.Again] ?? 1)
  }

  const getHardInterval = (): number => {
    if (typeof firstStep === 'string') {
      if (steps_length === 1) return Math.round(toMinutes(firstStep) * 1.5)
      const next = learning_steps[1]
      const nextMin =
        typeof next === 'string'
          ? toMinutes(next)
          : getExtraStepInfo(next)[Rating.Good]
      return nextMin
        ? Math.round((toMinutes(firstStep) + nextMin) / 2)
        : Math.round(toMinutes(firstStep) * 1.5)
    }
    return getExtraStepInfo(firstStep)[Rating.Hard] ?? 0
  }

  const getStepInfo = (index: number) =>
    learning_steps[Math.min(index, steps_length - 1)]

  const getGoodMinutes = (
    step: ReturnType<typeof getStepInfo>
  ): number | null => {
    return typeof step === 'string'
      ? toMinutes(step)
      : step['Good']
        ? toMinutes(step['Good'])
        : null
  }

  const result: ReturnType<TLearningStepsStrategy> = {}
  const step_info = getStepInfo(Math.max(0, cur_step))
  if (state === State.Review) {
    if (typeof step_info === 'string') {
      result[Rating.Again] = {
        scheduled_minutes: toMinutes(step_info),
        next_step: 0,
      }
    } else {
      const step = getExtraStepInfo(step_info)[Rating.Again]
      result[Rating.Again] = {
        scheduled_minutes: step ?? 0,
        next_step: 0,
      }
    }
    return result
  }

  if (typeof step_info === 'string') {
    result[Rating.Again] = {
      scheduled_minutes: getAgainInterval(),
      next_step: 0,
    }

    result[Rating.Hard] = {
      scheduled_minutes: getHardInterval(),
      next_step: cur_step,
    }

    if (cur_step + 1 < steps_length) {
      const next_info = getStepInfo(cur_step + 1)
      const nextMin = getGoodMinutes(next_info)

      if (nextMin) {
        result[Rating.Good] = {
          scheduled_minutes: Math.round(nextMin),
          next_step: cur_step + 1,
        }
      }
    }
  } else {
    const stepMap = getExtraStepInfo(step_info)
    for (const [grade, minutes] of Object.entries(stepMap)) {
      const g = Number(grade) as Grade
      result[g] = {
        scheduled_minutes: minutes,
        next_step:
          g === Rating.Again ? 0 : g === Rating.Hard ? cur_step : cur_step + 1,
      }
    }
  }
  return result
}
