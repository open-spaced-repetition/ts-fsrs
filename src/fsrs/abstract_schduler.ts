import { FSRSAlgorithm } from './algorithm'
import { TypeConvert } from './convert'
import {
  Card,
  RecordLog,
  Grade,
  RecordLogItem,
  State,
  Rating,
  ReviewLog,
  CardInput,
  DateInput,
} from './models'
import type { int, IScheduler } from './types'

export class AbstractScheduler implements IScheduler {
  private last: Card
  private current: Card
  private review_time: Date
  private next: Map<Grade, RecordLogItem> = new Map()
  private seed: string = ''
  private algorithm: FSRSAlgorithm

  constructor(
    card: CardInput | Card,
    now: DateInput,
    algorithm: FSRSAlgorithm
  ) {
    this.algorithm = algorithm

    this.last = TypeConvert.card(card)
    this.current = TypeConvert.card(card)
    this.review_time = TypeConvert.time(now)
    this.init()
  }

  private init() {
    const { state, last_review } = this.current
    let interval = 0 // card.state === State.New => 0
    if (state !== State.New && last_review) {
      interval = this.review_time.diff(last_review as Date, 'days')
    }
    this.current.last_review = this.review_time
    this.current.elapsed_days = interval
    this.current.reps += 1
    this.initSeed()
    this.algorithm.seed = this.seed
  }

  public preview(): RecordLog {
    return {
      [Rating.Again]: this.review(Rating.Again),
      [Rating.Hard]: this.review(Rating.Hard),
      [Rating.Good]: this.review(Rating.Good),
      [Rating.Easy]: this.review(Rating.Easy),
    } satisfies RecordLog
  }
  public review(grade: Grade): RecordLogItem {
    const { state } = this.last
    switch (state) {
      case State.New:
        return this.newState(grade)
      case State.Learning:
      case State.Relearning:
        return this.learningState(grade)
      case State.Review:
        return this.reviewState(grade)
    }
  }

  newState(grade: Grade): RecordLogItem {
    const exist = this.next.get(grade)
    if (exist) {
      return exist
    }
    const next = TypeConvert.card(this.current)
    next.difficulty = this.algorithm.init_difficulty(grade)
    next.stability = this.algorithm.init_stability(grade)

    switch (grade) {
      case Rating.Again:
        next.scheduled_days = 0
        next.due = this.review_time.scheduler(1 as int)
        next.state = State.Learning
        break
      case Rating.Hard:
        next.scheduled_days = 0
        next.due = this.review_time.scheduler(5 as int)
        next.state = State.Learning
        break
      case Rating.Good:
        next.scheduled_days = 0
        next.due = this.review_time.scheduler(10 as int)
        next.state = State.Learning
        break
      case Rating.Easy: {
        const easy_interval = this.algorithm.next_interval(
          next.stability,
          this.current.elapsed_days,
          this.algorithm.parameters.enable_fuzz
        )
        next.scheduled_days = easy_interval
        next.due = this.review_time.scheduler(easy_interval as int, true)
        next.state = State.Review
        break
      }
      default:
        throw new Error('Invalid grade')
    }
    const item = {
      card: next,
      log: this.buildLog(grade),
    } satisfies RecordLogItem
    this.next.set(grade, item)
    return item
  }

  learningState(grade: Grade): RecordLogItem {
    const exist = this.next.get(grade)
    if (exist) {
      return exist
    }
    const { state, difficulty, stability } = this.last
    const next = TypeConvert.card(this.current)
    const interval = this.current.elapsed_days
    next.difficulty = this.algorithm.next_difficulty(difficulty, grade)
    next.stability = this.algorithm.next_short_term_stability(stability, grade)

    switch (grade) {
      case Rating.Again: {
        next.scheduled_days = 0
        next.due = this.review_time.scheduler(5 as int, false)
        next.state = state
        break
      }
      case Rating.Hard: {
        next.scheduled_days = 0
        next.due = this.review_time.scheduler(10 as int)
        next.state = state
        break
      }
      case Rating.Good: {
        const good_interval = this.algorithm.next_interval(
          next.stability,
          interval
        )
        next.scheduled_days = good_interval
        next.due = this.review_time.scheduler(good_interval as int, true)
        next.state = State.Review
        break
      }
      case Rating.Easy: {
        const good_stability = this.algorithm.next_short_term_stability(
          stability,
          Rating.Good
        )
        const good_interval = this.algorithm.next_interval(
          good_stability,
          interval
        )
        const easy_interval = Math.max(
          this.algorithm.next_interval(next.stability, interval),
          good_interval + 1
        ) as int
        next.scheduled_days = easy_interval
        next.due = this.review_time.scheduler(easy_interval as int, true)
        next.state = State.Review
        break
      }
      default:
        throw new Error('Invalid grade')
    }
    const item = {
      card: next,
      log: this.buildLog(grade),
    } satisfies RecordLogItem
    this.next.set(grade, item)
    return item
  }

  reviewState(grade: Grade): RecordLogItem {
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
    let hard_interval: int, good_interval: int
    hard_interval = this.algorithm.next_interval(next_hard.stability, interval)
    good_interval = this.algorithm.next_interval(next_good.stability, interval)
    hard_interval = Math.min(hard_interval, good_interval) as int
    good_interval = Math.max(good_interval, hard_interval + 1) as int
    const easy_interval = Math.max(
      this.algorithm.next_interval(next_easy.stability, interval),
      good_interval + 1
    ) as int
    next_again.scheduled_days = 0
    next_again.due = this.review_time.scheduler(5 as int)
    next_again.state = State.Relearning
    next_again.lapses += 1
    next_hard.scheduled_days = hard_interval
    next_hard.due =
      hard_interval > 0
        ? this.review_time.scheduler(hard_interval, true)
        : this.review_time.scheduler(10 as int)
    next_hard.state = State.Review
    next_good.scheduled_days = good_interval
    next_good.due = this.review_time.scheduler(good_interval, true)
    next_good.state = State.Review
    next_easy.scheduled_days = easy_interval
    next_easy.due = this.review_time.scheduler(easy_interval, true)
    next_easy.state = State.Review

    const item_again = {
      card: next_again,
      log: this.buildLog(Rating.Again),
    } satisfies RecordLogItem
    const item_hard = {
      card: next_hard,
      log: this.buildLog(Rating.Hard),
    } satisfies RecordLogItem
    const item_good = {
      card: next_good,
      log: this.buildLog(Rating.Good),
    } satisfies RecordLogItem
    const item_easy = {
      card: next_easy,
      log: this.buildLog(Rating.Easy),
    } satisfies RecordLogItem

    this.next.set(Rating.Again, item_again)
    this.next.set(Rating.Hard, item_hard)
    this.next.set(Rating.Good, item_good)
    this.next.set(Rating.Easy, item_easy)
    return this.next.get(grade)!
  }

  private initSeed() {
    const time = this.review_time.getTime()
    const reps = this.current.reps
    const mul = this.current.difficulty * this.current.stability

    this.seed = `${time}_${reps}_${mul}`
  }

  private buildLog(rating: Grade): ReviewLog {
    const { last_review, due, elapsed_days } = this.last

    return {
      rating: rating,
      state: this.current.state,
      due: last_review || due,
      stability: this.current.stability,
      difficulty: this.current.difficulty,
      elapsed_days: this.current.elapsed_days,
      last_elapsed_days: elapsed_days,
      scheduled_days: this.current.scheduled_days,
      review: this.review_time,
    }
  }
}
