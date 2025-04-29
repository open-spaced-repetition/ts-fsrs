import { FSRSAlgorithm } from './algorithm'
import { TypeConvert } from './convert'
import { dateDiffInDays, Grades } from './help'
import {
  type Card,
  type Grade,
  type RecordLogItem,
  State,
  Rating,
  type ReviewLog,
  type CardInput,
  type DateInput,
} from './models'
import { DefaultInitSeedStrategy } from './strategies'
import type { TLearningStepsStrategy, TSeedStrategy } from './strategies/types'
import type { IPreview, IScheduler } from './types'

export abstract class AbstractScheduler implements IScheduler {
  protected last: Card
  protected current: Card
  protected review_time: Date
  protected next: Map<Grade, RecordLogItem> = new Map()
  protected algorithm: FSRSAlgorithm
  private initSeedStrategy: TSeedStrategy
  protected learningStepsStrategy?: TLearningStepsStrategy

  constructor(
    card: CardInput | Card,
    now: DateInput,
    algorithm: FSRSAlgorithm,
    strategies: {
      seed: TSeedStrategy
      learningSteps?: TLearningStepsStrategy
    } = {
      seed: DefaultInitSeedStrategy,
    }
  ) {
    this.algorithm = algorithm
    this.initSeedStrategy = strategies.seed.bind(this)
    this.learningStepsStrategy = strategies.learningSteps
    this.last = TypeConvert.card(card)
    this.current = TypeConvert.card(card)
    this.review_time = TypeConvert.time(now)
    this.init()
  }

  protected checkGrade(grade: Grade): void {
    if (!Number.isFinite(grade) || grade < 0 || grade > 4) {
      throw new Error(`Invalid grade "${grade}"`)
    }
  }

  private init() {
    const { state, last_review } = this.current
    let interval = 0 // card.state === State.New => 0
    if (state !== State.New && last_review) {
      interval = dateDiffInDays(last_review, this.review_time)
    }
    this.current.last_review = this.review_time
    this.current.elapsed_days = interval
    this.current.reps += 1
    this.algorithm.seed = this.initSeedStrategy()
  }

  public preview(): IPreview {
    return {
      [Rating.Again]: this.review(Rating.Again),
      [Rating.Hard]: this.review(Rating.Hard),
      [Rating.Good]: this.review(Rating.Good),
      [Rating.Easy]: this.review(Rating.Easy),
      [Symbol.iterator]: this.previewIterator.bind(this),
    } satisfies IPreview
  }

  private *previewIterator(): IterableIterator<RecordLogItem> {
    for (const grade of Grades) {
      yield this.review(grade)
    }
  }

  public review(grade: Grade): RecordLogItem {
    const { state } = this.last
    let item: RecordLogItem | undefined
    this.checkGrade(grade)
    switch (state) {
      case State.New:
        item = this.newState(grade)
        break
      case State.Learning:
      case State.Relearning:
        item = this.learningState(grade)
        break
      case State.Review:
        item = this.reviewState(grade)
        break
    }
    if (item) {
      return item
    }
    throw new Error('Invalid grade')
  }

  protected abstract newState(grade: Grade): RecordLogItem

  protected abstract learningState(grade: Grade): RecordLogItem

  protected abstract reviewState(grade: Grade): RecordLogItem

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
      learning_steps: this.current.learning_steps,
      review: this.review_time,
    } satisfies ReviewLog
  }
}
