import { SchedulingCard } from "./scheduler";
import { date_scheduler, fixDate, fixRating, fixState } from "./help";
import {
  Card,
  CardInput,
  DateInput,
  FSRSParameters,
  Rating,
  RecordLog,
  RecordLogItem,
  RescheduleOptions,
  ReviewLog,
  ReviewLogInput,
  State,
} from "./models";
import type { int } from "./type";
import { FSRSAlgorithm } from "./algorithm";

export class FSRS extends FSRSAlgorithm {
  constructor(param: Partial<FSRSParameters>) {
    super(param);
  }

  private preProcessCard(_card: CardInput | Card): Card {
    return {
      ..._card,
      state: fixState(_card.state),
      due: fixDate(_card.due),
      last_review: _card.last_review ? fixDate(_card.last_review) : undefined,
    };
  }

  private preProcessDate(_date: DateInput): Date {
    return fixDate(_date);
  }

  private preProcessLog(_log: ReviewLogInput | ReviewLog): ReviewLog {
    return {
      ..._log,
      due: fixDate(_log.due),
      rating: fixRating(_log.rating),
      state: fixState(_log.state),
      review: fixDate(_log.review),
    };
  }

  /**
   * @param card Card to be processed
   * @param now Current time or scheduled time
   * @param afterHandler Convert the result to another type. (Optional)
   * @example
   * ```
   * const card: Card = createEmptyCard(new Date());
   * const f = fsrs();
   * const recordLog = f.repeat(card, new Date());
   * ```
   * @example
   * ```
   * interface RevLogUnchecked
   *   extends Omit<ReviewLog, "due" | "review" | "state" | "rating"> {
   *   cid: string;
   *   due: Date | number;
   *   state: StateType;
   *   review: Date | number;
   *   rating: RatingType;
   * }
   *
   * interface RepeatRecordLog {
   *   card: CardUnChecked; //see method: createEmptyCard
   *   log: RevLogUnchecked;
   * }
   *
   * function repeatAfterHandler(recordLog: RecordLog) {
   *     const record: { [key in Grade]: RepeatRecordLog } = {} as {
   *       [key in Grade]: RepeatRecordLog;
   *     };
   *     for (const grade of Grades) {
   *       record[grade] = {
   *         card: {
   *           ...(recordLog[grade].card as Card & { cid: string }),
   *           due: recordLog[grade].card.due.getTime(),
   *           state: State[recordLog[grade].card.state] as StateType,
   *           last_review: recordLog[grade].card.last_review
   *             ? recordLog[grade].card.last_review!.getTime()
   *             : null,
   *         },
   *         log: {
   *           ...recordLog[grade].log,
   *           cid: (recordLog[grade].card as Card & { cid: string }).cid,
   *           due: recordLog[grade].log.due.getTime(),
   *           review: recordLog[grade].log.review.getTime(),
   *           state: State[recordLog[grade].log.state] as StateType,
   *           rating: Rating[recordLog[grade].log.rating] as RatingType,
   *         },
   *       };
   *     }
   *     return record;
   * }
   * const card: Card = createEmptyCard(new Date(), cardAfterHandler); //see method:  createEmptyCard
   * const f = fsrs();
   * const recordLog = f.repeat(card, new Date(), repeatAfterHandler);
   * ```
   */
  repeat<R = RecordLog>(
    card: CardInput | Card,
    now: DateInput,
    afterHandler?: (recordLog: RecordLog) => R,
  ): R {
    const processedCard = this.preProcessCard(card);
    now = this.preProcessDate(now);
    const s = new SchedulingCard(processedCard, now).update_state(
      processedCard.state,
    );
    this.seed = String(now.getTime()) + String(processedCard.reps);
    let easy_interval, good_interval, hard_interval;
    const interval = processedCard.elapsed_days;
    switch (processedCard.state) {
      case State.New:
        this.init_ds(s);
        s.again.due = now.scheduler(1 as int);
        s.hard.due = now.scheduler(5 as int);
        s.good.due = now.scheduler(10 as int);
        easy_interval = this.next_interval(s.easy.stability, interval);
        s.easy.scheduled_days = easy_interval;
        s.easy.due = now.scheduler(easy_interval, true);
        break;
      case State.Learning:
      case State.Relearning:
        hard_interval = 0;
        good_interval = this.next_interval(s.good.stability, interval);
        easy_interval = Math.max(
          this.next_interval(s.easy.stability, interval),
          good_interval + 1,
        );
        s.schedule(now, hard_interval, good_interval, easy_interval);
        break;
      case State.Review: {
        const last_d = processedCard.difficulty;
        const last_s = processedCard.stability;
        const retrievability = this.forgetting_curve(interval, last_s);
        this.next_ds(s, last_d, last_s, retrievability);
        hard_interval = this.next_interval(s.hard.stability, interval);
        good_interval = this.next_interval(s.good.stability, interval);
        hard_interval = Math.min(hard_interval, good_interval);
        good_interval = Math.max(good_interval, hard_interval + 1);
        easy_interval = Math.max(
          this.next_interval(s.easy.stability, interval),
          good_interval + 1,
        );
        s.schedule(now, hard_interval, good_interval, easy_interval);
        break;
      }
    }
    const recordLog = s.record_log(processedCard, now);
    if (afterHandler && typeof afterHandler === "function") {
      return afterHandler(recordLog);
    } else {
      return recordLog as R;
    }
  }

  get_retrievability = (
    card: CardInput | Card,
    now: Date,
  ): undefined | string => {
    const processedCard = this.preProcessCard(card);
    now = this.preProcessDate(now);
    if (processedCard.state !== State.Review) {
      return undefined;
    }
    const t = Math.max(now.diff(processedCard.last_review as Date, "days"), 0);
    return (
      (this.forgetting_curve(t, processedCard.stability) * 100).toFixed(2) + "%"
    );
  };

  /**
   *
   * @param card Card to be processed
   * @param log last review log
   * @param afterHandler Convert the result to another type. (Optional)
   * @example
   * ```
   * const now = new Date();
   * const f = fsrs();
   * const emptyCardFormAfterHandler = createEmptyCard(now);
   * const repeatFormAfterHandler = f.repeat(emptyCardFormAfterHandler, now);
   * const { card, log } = repeatFormAfterHandler[Rating.Hard];
   * const rollbackFromAfterHandler = f.rollback(card, log);
   * ```
   *
   * @example
   * ```
   * const now = new Date();
   * const f = fsrs();
   * const emptyCardFormAfterHandler = createEmptyCard(now, cardAfterHandler);  //see method: createEmptyCard
   * const repeatFormAfterHandler = f.repeat(emptyCardFormAfterHandler, now, repeatAfterHandler); //see method: fsrs.repeat()
   * const { card, log } = repeatFormAfterHandler[Rating.Hard];
   * const rollbackFromAfterHandler = f.rollback(card, log, cardAfterHandler);
   * ```
   */
  rollback<R = Card>(
    card: CardInput | Card,
    log: ReviewLogInput,
    afterHandler?: (prevCard: Card) => R,
  ): R {
    const processedCard = this.preProcessCard(card);
    const processedLog = this.preProcessLog(log);
    if (processedLog.rating === Rating.Manual) {
      throw new Error("Cannot rollback a manual rating");
    }
    let last_due, last_review, last_lapses;
    switch (processedLog.state) {
      case State.New:
        last_due = processedLog.due;
        last_review = undefined;
        last_lapses = 0;
        break;
      case State.Learning:
      case State.Relearning:
      case State.Review:
        last_due = processedLog.review;
        last_review = processedLog.due;
        last_lapses =
          processedCard.lapses -
          (processedLog.rating === Rating.Again &&
          processedLog.state === State.Review
            ? 1
            : 0);
        break;
    }

    const prevCard: Card = {
      ...processedCard,
      due: last_due,
      stability: processedLog.stability,
      difficulty: processedLog.difficulty,
      elapsed_days: processedLog.last_elapsed_days,
      scheduled_days: processedLog.scheduled_days,
      reps: Math.max(0, processedCard.reps - 1),
      lapses: Math.max(0, last_lapses),
      state: processedLog.state,
      last_review: last_review,
    };
    if (afterHandler && typeof afterHandler === "function") {
      return afterHandler(prevCard);
    } else {
      return prevCard as R;
    }
  }

  /**
   *
   * @param card Card to be processed
   * @param now Current time or scheduled time
   * @param reset_count Should the review count information(reps,lapses) be reset. (Optional)
   * @param afterHandler Convert the result to another type. (Optional)
   * @example
   * ```
   * const now = new Date();
   * const f = fsrs();
   * const emptyCard = createEmptyCard(now);
   * const scheduling_cards = f.repeat(emptyCard, now);
   * const { card, log } = scheduling_cards[Rating.Hard];
   * const forgetCard = f.forget(card, new Date(), true);
   * ```
   *
   * @example
   * ```
   * interface RepeatRecordLog {
   *   card: CardUnChecked; //see method: createEmptyCard
   *   log: RevLogUnchecked; //see method: fsrs.repeat()
   * }
   *
   * function forgetAfterHandler(recordLogItem: RecordLogItem): RepeatRecordLog {
   *     return {
   *       card: {
   *         ...(recordLogItem.card as Card & { cid: string }),
   *         due: recordLogItem.card.due.getTime(),
   *         state: State[recordLogItem.card.state] as StateType,
   *         last_review: recordLogItem.card.last_review
   *           ? recordLogItem.card.last_review!.getTime()
   *           : null,
   *       },
   *       log: {
   *         ...recordLogItem.log,
   *         cid: (recordLogItem.card as Card & { cid: string }).cid,
   *         due: recordLogItem.log.due.getTime(),
   *         review: recordLogItem.log.review.getTime(),
   *         state: State[recordLogItem.log.state] as StateType,
   *         rating: Rating[recordLogItem.log.rating] as RatingType,
   *       },
   *     };
   * }
   * const now = new Date();
   * const f = fsrs();
   * const emptyCardFormAfterHandler = createEmptyCard(now, cardAfterHandler); //see method:  createEmptyCard
   * const repeatFormAfterHandler = f.repeat(emptyCardFormAfterHandler, now, repeatAfterHandler); //see method: fsrs.repeat()
   * const { card } = repeatFormAfterHandler[Rating.Hard];
   * const forgetFromAfterHandler = f.forget(card, date_scheduler(now, 1, true), false, forgetAfterHandler);
   * ```
   */
  forget<R = RecordLogItem>(
    card: CardInput | Card,
    now: DateInput,
    reset_count: boolean = false,
    afterHandler?: (recordLogItem: RecordLogItem) => R,
  ): R {
    const processedCard = this.preProcessCard(card);
    now = this.preProcessDate(now);
    const scheduled_days =
      processedCard.state === State.New
        ? 0
        : now.diff(processedCard.last_review as Date, "days");
    const forget_log: ReviewLog = {
      rating: Rating.Manual,
      state: processedCard.state,
      due: processedCard.due,
      stability: processedCard.stability,
      difficulty: processedCard.difficulty,
      elapsed_days: 0,
      last_elapsed_days: processedCard.elapsed_days,
      scheduled_days: scheduled_days,
      review: now,
    };
    const forget_card: Card = {
      ...processedCard,
      due: now,
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: reset_count ? 0 : processedCard.reps,
      lapses: reset_count ? 0 : processedCard.lapses,
      state: State.New,
      last_review: processedCard.last_review,
    };
    const recordLogItem: RecordLogItem = { card: forget_card, log: forget_log };
    if (afterHandler && typeof afterHandler === "function") {
      return afterHandler(recordLogItem);
    } else {
      return recordLogItem as R;
    }
  }

  reschedule<T extends CardInput | Card>(
    cards: Array<T>,
    options: RescheduleOptions = {},
  ): Array<T> {
    const processedCard: T[] = [];
    for (const card of cards) {
      if (fixState(card.state) !== State.Review || !card.last_review) continue;
      const scheduled_days = Math.floor(card.scheduled_days) as int;
      const next_ivl = this.next_interval(
        +card.stability.toFixed(2),
        Math.round(card.elapsed_days),
        options.enable_fuzz ?? true,
      );
      if (next_ivl === scheduled_days || next_ivl === 0) continue;

      const processCard: T = { ...card };
      processCard.scheduled_days = next_ivl;
      const new_due = date_scheduler(processCard.last_review!, next_ivl, true);
      if (options.dateHandler && typeof options.dateHandler === "function") {
        processCard.due = options.dateHandler(new_due);
      } else {
        processCard.due = new_due;
      }
      processedCard.push(processCard);
    }
    return processedCard;
  }
}

/**
 * Create a new instance of TS-FSRS
 * @param params FSRSParameters
 * @example
 * ```typescript
 * const f = fsrs();
 * ```
 * @example
 * ```typescript
 * const params: FSRSParameters = generatorParameters({ maximum_interval: 1000 });
 * const f = fsrs(params);
 * ```
 * @example
 * ```typescript
 * const f = fsrs({ maximum_interval: 1000 });
 * ```
 */
export const fsrs = (params?: Partial<FSRSParameters>) => {
  return new FSRS(params || {});
};