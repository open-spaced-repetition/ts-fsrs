import { AbstractScheduler } from '../abstract_schduler'
import { TypeConvert } from '../convert'
import {
  type Card,
  type Grade,
  Rating,
  type RecordLogItem,
  State,
} from '../models'
import type { int } from '../types'

export default class LongTermScheduler extends AbstractScheduler {
  protected override newState(grade: Grade): RecordLogItem {
    const exist = this.next.get(grade)
    if (exist) {
      return exist
    }

    const first_difficulty = this.algorithm.init_difficulty(grade)
    const first_stability = this.algorithm.init_stability(grade)
    const first_interval = 0

    this.current.difficulty = first_difficulty
    this.current.stability = first_stability
    this.current.scheduled_days = 0
    this.current.elapsed_days = 0

    const next_again = TypeConvert.card(this.current)
    const next_hard = TypeConvert.card(this.current)
    const next_good = TypeConvert.card(this.current)
    const next_easy = TypeConvert.card(this.current)

    this.next_short_term_ds(
      next_again,
      next_hard,
      next_good,
      next_easy,
      first_difficulty,
      first_stability
    )
    this.next_interval(
      next_again,
      next_hard,
      next_good,
      next_easy,
      first_interval
    )

    this.next_state(next_again, next_hard, next_good, next_easy)
    this.update_next(next_again, next_hard, next_good, next_easy)
    return this.next.get(grade)!
  }

  private next_short_term_ds(
    next_again: Card,
    next_hard: Card,
    next_good: Card,
    next_easy: Card,
    difficulty: number,
    stability: number
  ): void {
    next_again.difficulty = this.algorithm.next_difficulty(
      difficulty,
      Rating.Again
    )
    next_again.stability = this.algorithm.next_short_term_stability(
      stability,
      Rating.Again
    )

    next_hard.difficulty = this.algorithm.next_difficulty(
      difficulty,
      Rating.Hard
    )
    next_hard.stability = this.algorithm.next_short_term_stability(
      stability,
      Rating.Hard
    )

    next_good.difficulty = this.algorithm.next_difficulty(
      difficulty,
      Rating.Good
    )
    next_good.stability = this.algorithm.next_short_term_stability(
      stability,
      Rating.Good
    )

    next_easy.difficulty = this.algorithm.next_difficulty(
      difficulty,
      Rating.Easy
    )
    next_easy.stability = this.algorithm.next_short_term_stability(
      stability,
      Rating.Easy
    )
  }

  protected override learningState(grade: Grade): RecordLogItem {
    throw new Error('Long-term Scheduler not implemented.')
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

    this.update_next(next_again, next_hard, next_good, next_easy)
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
    next_again.stability = this.algorithm.next_forget_stability(
      difficulty,
      stability,
      retrievability
    )
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
   * Review/New next_interval
   */
  private next_interval(
    next_again: Card,
    next_hard: Card,
    next_good: Card,
    next_easy: Card,
    interval: number
  ): void {
    let again_interval: int,
      hard_interval: int,
      good_interval: int,
      easy_interval: int
    again_interval = this.algorithm.next_interval(
      next_again.stability,
      interval
    )
    hard_interval = this.algorithm.next_interval(next_hard.stability, interval)
    good_interval = this.algorithm.next_interval(next_good.stability, interval)
    easy_interval = this.algorithm.next_interval(next_easy.stability, interval)

    again_interval = Math.min(again_interval, hard_interval) as int
    hard_interval = Math.max(hard_interval, again_interval + 1) as int
    good_interval = Math.max(good_interval, hard_interval + 1) as int
    easy_interval = Math.max(easy_interval, good_interval + 1) as int

    next_again.scheduled_days = again_interval
    next_again.due = this.review_time.scheduler(again_interval as int)

    next_hard.scheduled_days = hard_interval
    next_hard.due = this.review_time.scheduler(hard_interval, true)

    next_good.scheduled_days = good_interval
    next_good.due = this.review_time.scheduler(good_interval, true)

    next_easy.scheduled_days = easy_interval
    next_easy.due = this.review_time.scheduler(easy_interval, true)
  }

  /**
   * Review/New next_state
   */
  private next_state(
    next_again: Card,
    next_hard: Card,
    next_good: Card,
    next_easy: Card
  ) {
    next_again.state = State.Review
    // next_again.lapses += 1

    next_hard.state = State.Review

    next_good.state = State.Review

    next_easy.state = State.Review
  }

  private update_next(
    next_again: Card,
    next_hard: Card,
    next_good: Card,
    next_easy: Card
  ) {
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
  }
}
