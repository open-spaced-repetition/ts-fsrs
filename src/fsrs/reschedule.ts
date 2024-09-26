import { TypeConvert } from './convert'
import { createEmptyCard } from './default'
import type { FSRS } from './fsrs'
import {
  Card,
  CardInput,
  FSRSHistory,
  Grade,
  Rating,
  RecordLogItem,
  ReviewLog,
  State,
} from './models'

export class Reschedule {
  private fsrs: FSRS
  constructor(fsrs: FSRS) {
    this.fsrs = fsrs
  }

  replay(card: Card, reviewed: Date, rating: Grade): RecordLogItem {
    return this.fsrs.next(card, reviewed, rating)
  }

  processManual(
    card: Card,
    state: State,
    reviewed: Date,
    elapsed_days?: number,
    stability?: number,
    difficulty?: number,
    due?: Date
  ): RecordLogItem {
    if (typeof state === 'undefined') {
      throw new Error('reschedule: state is required for manual rating')
    }
    let log: ReviewLog
    let next_card: Card
    if (<State>state === State.New) {
      log = {
        rating: Rating.Manual,
        state: state,
        due: <Date>due ?? reviewed,
        stability: card.stability,
        difficulty: card.difficulty,
        elapsed_days: elapsed_days || 0,
        last_elapsed_days: card.elapsed_days,
        scheduled_days: card.scheduled_days,
        review: <Date>reviewed,
      } satisfies ReviewLog
      next_card = createEmptyCard<Card>(reviewed)
      next_card.last_review = reviewed
    } else {
      if (typeof due === 'undefined') {
        throw new Error('reschedule: due is required for manual rating')
      }
      const scheduled_days = due.diff(reviewed as Date, 'days')
      elapsed_days =
        elapsed_days || reviewed.diff(card.last_review as Date, 'days')
      log = {
        rating: Rating.Manual,
        state: <State>state,
        due: <Date>card.last_review,
        stability: card.stability,
        difficulty: card.difficulty,
        elapsed_days: elapsed_days,
        last_elapsed_days: card.elapsed_days,
        scheduled_days: card.scheduled_days,
        review: <Date>reviewed,
      } satisfies ReviewLog
      next_card = {
        ...card,
        state: <State>state,
        due: <Date>due,
        last_review: <Date>reviewed,
        stability: stability || card.stability,
        difficulty: difficulty || card.difficulty,
        elapsed_days: elapsed_days,
        scheduled_days: scheduled_days,
        reps: card.reps + 1,
      } satisfies Card
    }

    return { card: next_card, log }
  }

  reschedule(card: CardInput, reviews: FSRSHistory[]) {
    const collections: RecordLogItem[] = []
    let _card = TypeConvert.card(card)
    for (const review of reviews) {
      let item: RecordLogItem
      if (review.rating === Rating.Manual) {
        item = this.processManual(
          _card,
          review.state,
          review.review,
          review.elapsed_days,
          review.stability,
          review.difficulty,
          review.due
        )
      } else {
        item = this.replay(_card, review.review, review.rating)
      }
      collections.push(item)
      _card = item.card
    }
    return collections
  }
}
