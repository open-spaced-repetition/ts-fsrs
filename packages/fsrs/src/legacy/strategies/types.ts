import type { IFSRSModel } from '@/kit/index.js'
import type {
  Card,
  CardInput,
  DateInput,
  FSRSParameters,
} from '@/legacy/models.js'
import type { IScheduler } from '@/legacy/types.js'
import type { LearningStepsResolver } from '@/middlewares/learning-steps/types.js'

export enum StrategyMode {
  SCHEDULER = 'Scheduler',
  LEARNING_STEPS = 'LearningSteps',
}

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
  [StrategyMode.LEARNING_STEPS]: LearningStepsResolver
}

export type TStrategyHandler<E = StrategyMode> = E extends StrategyMode
  ? StrategyMap[E]
  : never
