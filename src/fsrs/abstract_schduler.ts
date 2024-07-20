import { FSRSAlgorithm } from './algorithm'
import { TypeConvert } from './convert'
import {
  type Card,
  type RecordLog,
  type Grade,
  type RecordLogItem,
  State,
  Rating,
  type ReviewLog,
  type CardInput,
  type DateInput,
} from './models'
import type { IScheduler } from './types'

export abstract class AbstractScheduler implements IScheduler {
  protected last: Card
  protected current: Card
  protected review_time: Date
  protected next: Map<Grade, RecordLogItem> = new Map()
  protected algorithm: FSRSAlgorithm

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

  protected abstract newState(grade: Grade): RecordLogItem

  protected abstract learningState(grade: Grade): RecordLogItem

  protected abstract reviewState(grade: Grade): RecordLogItem

  private initSeed() {
    const time = this.review_time.getTime()
    const reps = this.current.reps
    const mul = this.current.difficulty * this.current.stability
    this.algorithm.seed = `${time}_${reps}_${mul}`
  }

  protected buildLog(rating: Grade): ReviewLog {
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
    } satisfies ReviewLog
  }
}
