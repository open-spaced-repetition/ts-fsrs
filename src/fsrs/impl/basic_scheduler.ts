import { AbstractScheduler } from '../abstract_scheduler'
import type { FSRSAlgorithm } from '../algorithm'
import { TypeConvert } from '../convert'
import { date_scheduler } from '../help'
import {
  type Card,
  type CardInput,
  type DateInput,
  type Grade,
  Rating,
  type RecordLogItem,
  State,
} from '../models'
import {
  StrategyMode,
  type TLearningStepsStrategy,
  type TStrategyHandler,
} from '../strategies'
import { BasicLearningStepsStrategy } from '../strategies/learning_steps'
import type { int } from '../types'

export default class BasicScheduler extends AbstractScheduler {
  private learningStepsStrategy: TLearningStepsStrategy

  constructor(
    card: CardInput | Card,
    now: DateInput,
    algorithm: FSRSAlgorithm,
    strategies?: Map<StrategyMode, TStrategyHandler>
  ) {
    super(card, now, algorithm, strategies)

    // init learning steps strategy
    let learningStepStrategy = BasicLearningStepsStrategy
    if (this.strategies) {
      const custom_strategy = this.strategies.get(StrategyMode.LEARNING_STEPS)
      if (custom_strategy) {
        learningStepStrategy = custom_strategy as TLearningStepsStrategy
      }
    }
    this.learningStepsStrategy = learningStepStrategy
  }

  private getLearningInfo(card: Card, grade: Grade) {
    const parameters = this.algorithm.parameters
    card.learning_steps = card.learning_steps || 0
    const steps_strategy = this.learningStepsStrategy(
      parameters,
      card.state,
      // In the original learning steps setup (Again = 5m, Hard = 10m, Good = FSRS),
      // not adding 1 can cause slight variations in the memory state’s ds.
      this.current.state === State.Learning &&
        grade !== Rating.Again &&
        grade !== Rating.Hard
        ? card.learning_steps + 1
        : card.learning_steps
    )
    const scheduled_minutes = Math.max(
      0,
      steps_strategy[grade]?.scheduled_minutes ?? 0
    )
    const next_steps = Math.max(0, steps_strategy[grade]?.next_step ?? 0)
    return {
      scheduled_minutes,
      next_steps,
    }
  }
  /**
   * @description This function applies the learning steps based on the current card's state and grade.
   */
  private applyLearningSteps(
    nextCard: Card,
    grade: Grade,
    /**
     * returns the next state for the card (if applicable)
     */
    to_state: State
  ) {
    const { scheduled_minutes, next_steps } = this.getLearningInfo(
      this.current,
      grade
    )
    if (
      scheduled_minutes > 0 &&
      scheduled_minutes < 1440 /** 1440 minutes = 1 day */
    ) {
      nextCard.learning_steps = next_steps
      nextCard.scheduled_days = 0
      nextCard.state = to_state
      nextCard.due = date_scheduler(
        this.review_time,
        Math.round(scheduled_minutes) as int,
        false /** true:days false: minute */
      )
    } else {
      nextCard.state = State.Review
      if (scheduled_minutes >= 1440) {
        nextCard.learning_steps = next_steps
        nextCard.due = date_scheduler(
          this.review_time,
          Math.round(scheduled_minutes) as int,
          false /** true:days false: minute */
        )
        nextCard.scheduled_days = Math.floor(scheduled_minutes / 1440)
      } else {
        nextCard.learning_steps = 0
        const interval = this.algorithm.next_interval(
          nextCard.stability,
          this.elapsed_days
        )
        nextCard.scheduled_days = interval
        nextCard.due = date_scheduler(this.review_time, interval as int, true)
      }
    }
  }

  protected override newState(grade: Grade): RecordLogItem {
    const exist = this.next.get(grade)
    if (exist) {
      return exist
    }
    const next = this.next_ds(this.elapsed_days, grade)
    this.applyLearningSteps(next, grade, State.Learning)
    const item = {
      card: next,
      log: this.buildLog(grade),
    } satisfies RecordLogItem
    this.next.set(grade, item)
    return item
  }

  protected override learningState(grade: Grade): RecordLogItem {
    const exist = this.next.get(grade)
    if (exist) {
      return exist
    }
    const next = this.next_ds(this.elapsed_days, grade)
    this.applyLearningSteps(
      next,
      grade,
      this.last.state /** Learning or Relearning */
    )
    const item = {
      card: next,
      log: this.buildLog(grade),
    } satisfies RecordLogItem
    this.next.set(grade, item)
    return item
  }

  protected override reviewState(grade: Grade): RecordLogItem {
    const exist = this.next.get(grade)
    if (exist) {
      return exist
    }
    const interval = this.elapsed_days
    const retrievability = this.algorithm.forgetting_curve(
      interval,
      this.current.stability
    )
    const next_again = this.next_ds(interval, Rating.Again, retrievability)
    const next_hard = this.next_ds(interval, Rating.Hard, retrievability)
    const next_good = this.next_ds(interval, Rating.Good, retrievability)
    const next_easy = this.next_ds(interval, Rating.Easy, retrievability)

    this.next_interval(next_hard, next_good, next_easy, interval)
    this.next_state(next_hard, next_good, next_easy)
    this.applyLearningSteps(next_again, Rating.Again, State.Relearning)
    next_again.lapses += 1

    const item_again = {
      card: next_again,
      log: this.buildLog(Rating.Again),
    } satisfies RecordLogItem
    const item_hard = {
      card: next_hard,
      log: super.buildLog(Rating.Hard),
    } satisfies RecordLogItem
    const item_good = {
      card: next_good,
      log: super.buildLog(Rating.Good),
    } satisfies RecordLogItem
    const item_easy = {
      card: next_easy,
      log: super.buildLog(Rating.Easy),
    } satisfies RecordLogItem

    this.next.set(Rating.Again, item_again)
    this.next.set(Rating.Hard, item_hard)
    this.next.set(Rating.Good, item_good)
    this.next.set(Rating.Easy, item_easy)
    return this.next.get(grade)!
  }

  /**
   * Review next_ds
   */
  private next_ds(t: number, g: Grade, r?: number): Card {
    const next_state = this.algorithm.next_state(
      {
        difficulty: this.current.difficulty,
        stability: this.current.stability,
      },
      t,
      g,
      r
    )

    const card = TypeConvert.card(this.current)
    card.difficulty = next_state.difficulty
    card.stability = next_state.stability

    return card
  }

  /**
   * Review next_interval
   */
  private next_interval(
    next_hard: Card,
    next_good: Card,
    next_easy: Card,
    interval: number
  ): void {
    let hard_interval: int, good_interval: int
    hard_interval = this.algorithm.next_interval(next_hard.stability, interval)
    good_interval = this.algorithm.next_interval(next_good.stability, interval)
    hard_interval = Math.min(hard_interval, good_interval) as int
    good_interval = Math.max(good_interval, hard_interval + 1) as int
    const easy_interval = Math.max(
      this.algorithm.next_interval(next_easy.stability, interval),
      good_interval + 1
    ) as int

    next_hard.scheduled_days = hard_interval
    next_hard.due = date_scheduler(this.review_time, hard_interval, true)
    next_good.scheduled_days = good_interval
    next_good.due = date_scheduler(this.review_time, good_interval, true)

    next_easy.scheduled_days = easy_interval
    next_easy.due = date_scheduler(this.review_time, easy_interval, true)
  }

  /**
   * Review next_state
   */
  private next_state(next_hard: Card, next_good: Card, next_easy: Card) {
    next_hard.state = State.Review
    next_hard.learning_steps = 0

    next_good.state = State.Review
    next_good.learning_steps = 0

    next_easy.state = State.Review
    next_easy.learning_steps = 0
  }
}
