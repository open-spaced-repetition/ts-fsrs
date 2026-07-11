import type { AbstractScheduler } from '../abstract_scheduler'
import type { IFSRSModel } from '../kit/index.js'
import type { LearningStepsResolver } from '../middlewares/learning-steps/types.js'
import type { Card, CardInput, DateInput, FSRSParameters } from '../models'
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
    model: IFSRSModel,
    parameters: FSRSParameters,
    strategies: Map<StrategyMode, TStrategyHandler>
  ) => IScheduler

type StrategyMap = {
  [StrategyMode.SCHEDULER]: TSchedulerStrategy
  [StrategyMode.SEED]: TSeedStrategy
  [StrategyMode.LEARNING_STEPS]: LearningStepsResolver
}

export type TStrategyHandler<E = StrategyMode> = E extends StrategyMode
  ? StrategyMap[E]
  : never
