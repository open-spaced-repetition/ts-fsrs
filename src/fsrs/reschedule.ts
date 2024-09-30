import { TypeConvert } from './convert'
import { createEmptyCard } from './default'
import type { FSRS } from './fsrs'
import {
  type Card,
  type CardInput,
  type FSRSHistory,
  type Grade,
  Rating,
  type RecordLogItem,
  type ReviewLog,
  State,
} from './models'

/**
 * The `Reschedule` class provides methods to handle the rescheduling of cards based on their review history.
 * determine the next review dates and update the card's state accordingly.
 */
export class Reschedule {
  private fsrs: FSRS
  /**
   * Creates an instance of the `Reschedule` class.
   * @param fsrs - An instance of the FSRS class used for scheduling.
   */
  constructor(fsrs: FSRS) {
    this.fsrs = fsrs
  }

  /**
   * Replays a review for a card and determines the next review date based on the given rating.
   * @param card - The card being reviewed.
   * @param reviewed - The date the card was reviewed.
   * @param rating - The grade given to the card during the review.
   * @returns A `RecordLogItem` containing the updated card and review log.
   */
  replay(card: Card, reviewed: Date, rating: Grade): RecordLogItem {
    return this.fsrs.next(card, reviewed, rating)
  }

  /**
   * Processes a manual review for a card, allowing for custom state, stability, difficulty, and due date.
   * @param card - The card being reviewed.
   * @param state - The state of the card after the review.
   * @param reviewed - The date the card was reviewed.
   * @param elapsed_days - The number of days since the last review.
   * @param stability - (Optional) The stability of the card.
   * @param difficulty - (Optional) The difficulty of the card.
   * @param due - (Optional) The due date for the next review.
   * @returns A `RecordLogItem` containing the updated card and review log.
   * @throws Will throw an error if the state or due date is not provided when required.
   */
  handleManualRating(
    card: Card,
    state: State,
    reviewed: Date,
    elapsed_days: number,
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
        elapsed_days: elapsed_days,
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
      log = {
        rating: Rating.Manual,
        state: <State>card.state,
        due: card.last_review || card.due,
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

  /**
   * Reschedules a card based on its review history.
   *
   * @param current_card - The card to be rescheduled.
   * @param reviews - An array of review history objects.
   * @returns An array of record log items representing the rescheduling process.
   */
  reschedule(current_card: CardInput, reviews: FSRSHistory[]) {
    const collections: RecordLogItem[] = []
    let _card = createEmptyCard<Card>(current_card.due)
    for (const review of reviews) {
      let item: RecordLogItem
      if (review.rating === Rating.Manual) {
        // ref: abstract_scheduler.ts#init
        let interval = 0
        if (_card.state !== State.New && _card.last_review) {
          interval = review.review.diff(_card.last_review as Date, 'days')
        }
        item = this.handleManualRating(
          _card,
          review.state,
          review.review,
          interval,
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

  calculateManualRecord(
    current_card: CardInput,
    record_log_item?: RecordLogItem,
    update_memory?: boolean
  ): RecordLogItem | null {
    if (!record_log_item) {
      return null
    }
    // if first_card === recordItem.card then return null
    const { card: reschedule_card, log } = record_log_item
    const cur_card = <Card>TypeConvert.card(current_card) // copy card
    if (cur_card.due.getTime() === reschedule_card.due.getTime()) {
      return null
    }
    let interval = 0
    if (cur_card.state !== State.New && cur_card.last_review) {
      interval = log.review.diff(cur_card.last_review as Date, 'days')
    }
    return this.handleManualRating(
      cur_card,
      reschedule_card.state,
      log.review,
      log.elapsed_days,
      update_memory ? reschedule_card.stability : undefined,
      update_memory ? reschedule_card.difficulty : undefined,
      reschedule_card.due
    )
  }
}
