import { AbstractScheduler } from '../abstract_scheduler'
import { TypeConvert } from '../convert'
import { date_scheduler } from '../help'
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

    this.current.scheduled_days = 0
    // pending removal in v6.0.0
    this.current.elapsed_days = 0

    const first_interval = 0
    const next_again = this.next_ds(first_interval, Rating.Again)
    const next_hard = this.next_ds(first_interval, Rating.Hard)
    const next_good = this.next_ds(first_interval, Rating.Good)
    const next_easy = this.next_ds(first_interval, Rating.Easy)

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
   * @see https://github.com/open-spaced-repetition/ts-fsrs/issues/98#issuecomment-2241923194
   */
  protected override learningState(grade: Grade): RecordLogItem {
    return this.reviewState(grade)
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

    this.next_interval(next_again, next_hard, next_good, next_easy, interval)
    this.next_state(next_again, next_hard, next_good, next_easy)
    next_again.lapses += 1

    this.update_next(next_again, next_hard, next_good, next_easy)
    return this.next.get(grade)!
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
    next_again.due = date_scheduler(this.review_time, again_interval, true)

    next_hard.scheduled_days = hard_interval
    next_hard.due = date_scheduler(this.review_time, hard_interval, true)

    next_good.scheduled_days = good_interval
    next_good.due = date_scheduler(this.review_time, good_interval, true)

    next_easy.scheduled_days = easy_interval
    next_easy.due = date_scheduler(this.review_time, easy_interval, true)
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
    next_again.learning_steps = 0

    next_hard.state = State.Review
    next_hard.learning_steps = 0

    next_good.state = State.Review
    next_good.learning_steps = 0

    next_easy.state = State.Review
    next_easy.learning_steps = 0
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
