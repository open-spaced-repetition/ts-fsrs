import { AbstractScheduler } from '../abstract_scheduler'
import { TypeConvert } from '../convert'
import { S_MIN } from '../constant'
import { clamp } from '../help'
import {
  type Card,
  type Grade,
  Rating,
  type RecordLogItem,
  State,
} from '../models'
import type { int } from '../types'

export default class BasicScheduler extends AbstractScheduler {
  private getLearningMinutes(card: Card, grade: Grade) {
    const parameters = this.algorithm.parameters
    const steps_strategy = this.learningStepsStrategy?.(
      parameters,
      card.state,
      card.learning_steps
    )
    const scheduled_minutes = Math.max(
      0,
      steps_strategy?.[grade]?.scheduled_minutes ?? 0
    )
    return scheduled_minutes
  }

  protected override newState(grade: Grade): RecordLogItem {
    const exist = this.next.get(grade)
    if (exist) {
      return exist
    }
    const next = TypeConvert.card(this.current)
    next.difficulty = this.algorithm.init_difficulty(grade)
    next.stability = this.algorithm.init_stability(grade)

    const scheduled_minutes = this.getLearningMinutes(this.current, grade)
    if (scheduled_minutes > 0 && scheduled_minutes < 1440 /** 1d */) {
      next.learning_steps = this.current.learning_steps + 1
      next.scheduled_days = 0
      next.state = State.Learning
      next.due = this.review_time.scheduler(
        Math.round(scheduled_minutes) as int,
        next.learning_steps === 0 /** true:days false: minute */
      )
    } else {
      next.learning_steps = 0
      next.state = State.Review
      if (scheduled_minutes >= 1440) {
        next.due = this.review_time.scheduler(
          Math.round(scheduled_minutes) as int,
          false /** true:days false: minute */
        )
        next.scheduled_days = Math.floor(scheduled_minutes / 1440)
      } else {
        const interval = this.algorithm.next_interval(
          next.stability,
          this.current.elapsed_days
        )
        next.scheduled_days = interval
        next.due = this.review_time.scheduler(interval as int, true)
      }
    }

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
    const { state, difficulty, stability } = this.last
    const next = TypeConvert.card(this.current)
    const interval = this.current.elapsed_days
    next.difficulty = this.algorithm.next_difficulty(difficulty, grade)
    next.stability = this.algorithm.next_short_term_stability(stability, grade)
    const scheduled_minutes = this.getLearningMinutes(this.current, grade)

    if (scheduled_minutes > 0 && scheduled_minutes < 1440 /** 1d */) {
      next.learning_steps = this.current.learning_steps + 1
      next.scheduled_days = 0
      next.state = state // learning or relearning
      next.due = this.review_time.scheduler(
        Math.round(scheduled_minutes) as int,
        false /** true:days false: minute */
      )
    } else {
      if (scheduled_minutes >= 1440) {
        next.due = this.review_time.scheduler(
          Math.round(scheduled_minutes) as int,
          true /** true:days false: minute */
        )
        next.scheduled_days = Math.floor(scheduled_minutes / 1440)
      } else {
        const next_interval = this.algorithm.next_interval(
          next.stability,
          interval
        )
        next.scheduled_days = next_interval
        next.due = this.review_time.scheduler(next_interval as int, true)
      }
      next.state = State.Review
    }

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
    const interval = this.current.elapsed_days
    const { difficulty, stability } = this.last
    const retrievability = this.algorithm.forgetting_curve(interval, stability)
    const next_again = TypeConvert.card(this.current)
    const next_hard = TypeConvert.card(this.current)
    const next_good = TypeConvert.card(this.current)
    const next_easy = TypeConvert.card(this.current)

    this.next_ds(
      next_again,
      next_hard,
      next_good,
      next_easy,
      difficulty,
      stability,
      retrievability
    )

    this.next_interval(next_again, next_hard, next_good, next_easy, interval)
    this.next_state(next_again, next_hard, next_good, next_easy)
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
  private next_ds(
    next_again: Card,
    next_hard: Card,
    next_good: Card,
    next_easy: Card,
    difficulty: number,
    stability: number,
    retrievability: number
  ): void {
    next_again.difficulty = this.algorithm.next_difficulty(
      difficulty,
      Rating.Again
    )
    const nextSMin =
      stability /
      Math.exp(
        this.algorithm.parameters.w[17] * this.algorithm.parameters.w[18]
      )
    const s_after_fail = this.algorithm.next_forget_stability(
      difficulty,
      stability,
      retrievability
    )
    next_again.stability = clamp(+nextSMin.toFixed(8), S_MIN, s_after_fail)

    next_hard.difficulty = this.algorithm.next_difficulty(
      difficulty,
      Rating.Hard
    )
    next_hard.stability = this.algorithm.next_recall_stability(
      difficulty,
      stability,
      retrievability,
      Rating.Hard
    )
    next_good.difficulty = this.algorithm.next_difficulty(
      difficulty,
      Rating.Good
    )
    next_good.stability = this.algorithm.next_recall_stability(
      difficulty,
      stability,
      retrievability,
      Rating.Good
    )
    next_easy.difficulty = this.algorithm.next_difficulty(
      difficulty,
      Rating.Easy
    )
    next_easy.stability = this.algorithm.next_recall_stability(
      difficulty,
      stability,
      retrievability,
      Rating.Easy
    )
  }

  /**
   * Review next_interval
   */
  private next_interval(
    next_again: Card,
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

    const scheduled_minutes = this.getLearningMinutes(
      this.current,
      Rating.Again
    )
    if (scheduled_minutes > 0 && scheduled_minutes < 1440 /** 1d */) {
      next_again.scheduled_days = 0
      next_again.due = this.review_time.scheduler(
        scheduled_minutes as int,
        false
      )
    } else {
      if (scheduled_minutes >= 1440) {
        next_again.due = this.review_time.scheduler(
          Math.round(scheduled_minutes) as int,
          true /** true:days false: minute */
        )
        next_again.scheduled_days = Math.floor(scheduled_minutes / 1440)
      } else {
        const next_interval = this.algorithm.next_interval(
          next_again.stability,
          interval
        )
        next_again.scheduled_days = next_interval
        next_again.due = this.review_time.scheduler(next_interval as int, true)
      }
    }

    next_hard.scheduled_days = hard_interval
    next_hard.due = this.review_time.scheduler(hard_interval, true)
    next_good.scheduled_days = good_interval
    next_good.due = this.review_time.scheduler(good_interval, true)

    next_easy.scheduled_days = easy_interval
    next_easy.due = this.review_time.scheduler(easy_interval, true)
  }

  /**
   * Review next_state
   */
  private next_state(
    next_again: Card,
    next_hard: Card,
    next_good: Card,
    next_easy: Card
  ) {
    if (next_again.scheduled_days > 0) {
      next_again.state = State.Review
    } else {
      next_again.state = State.Relearning
    }
    // next_again.lapses += 1
    next_again.learning_steps = 0

    next_hard.state = State.Review
    next_hard.learning_steps = 0

    next_good.state = State.Review
    next_good.learning_steps = 0

    next_easy.state = State.Review
    next_easy.learning_steps = 0
  }
}
