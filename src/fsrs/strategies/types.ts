import type { AbstractScheduler } from '../abstract_scheduler'
import type { FSRSAlgorithm } from '../algorithm'
import type {
  Card,
  CardInput,
  DateInput,
  FSRSParameters,
  Grade,
  State,
} from '../models'
import type { IScheduler } from '../types'

export enum StrategyMode {
  SCHEDULER = 'Scheduler',
  LEARNING_STEPS = 'LearningSteps',
  SEED = 'Seed',
}

export type TSeedStrategy = (this: AbstractScheduler) => string
export type TSchedulerStrategy<T extends CardInput | Card = CardInput | Card> =
  new (
    card: T,
    now: DateInput,
    algorithm: FSRSAlgorithm,
    strategies: { seed: TSeedStrategy; learningSteps?: TLearningStepsStrategy }
  ) => IScheduler

export type TLearningStepsStrategy = (
  params: FSRSParameters,
  state: State,
  cur_step: number
) => {
  [K in Grade]?: { scheduled_minutes: number; next_step: number }
}

export type TStrategyHandler<E = StrategyMode> =
  E extends StrategyMode.SCHEDULER
    ? TSchedulerStrategy
    : E extends StrategyMode.SEED
      ? TSeedStrategy
      : E extends StrategyMode.LEARNING_STEPS
        ? TLearningStepsStrategy
        : never
