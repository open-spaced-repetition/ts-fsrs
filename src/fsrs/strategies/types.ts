import type { AbstractScheduler } from '../abstract_scheduler'
import type { FSRSAlgorithm } from '../algorithm'
import type { Card, CardInput, DateInput } from '../models'
import type { IScheduler } from '../types'

export enum StrategyMode {
  SCHEDULER = 'Scheduler',
  SEED = 'Seed',
}

export type TSeedStrategy = (this: AbstractScheduler) => string
export type TSchedulerStrategy<T extends CardInput | Card = CardInput | Card> =
  new (
    card: T,
    now: DateInput,
    algorithm: FSRSAlgorithm,
    strategies: { seed: TSeedStrategy }
  ) => IScheduler

export type TStrategyHandler<E = StrategyMode> =
  E extends StrategyMode.SCHEDULER
    ? TSchedulerStrategy
    : E extends StrategyMode.SEED
      ? TSeedStrategy
      : never
