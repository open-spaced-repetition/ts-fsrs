import { date_scheduler } from './help'
import {
  Card,
  CardInput,
  DateInput,
  FSRSParameters,
  Grade,
  Rating,
  RecordLog,
  RecordLogItem,
  RescheduleOptions,
  ReviewLog,
  ReviewLogInput,
  State,
} from './models'
import type { int } from './types'
import { FSRSAlgorithm } from './algorithm'
import { TypeConvert } from './convert'
import BasicScheduler from './impl/basic_schduler'
import LongTermScheduler from './impl/long_term_schduler'

export class FSRS extends FSRSAlgorithm {
  private Schduler
  constructor(param: Partial<FSRSParameters>) {
    super(param)
    const { enable_short_term } = this.parameters
    this.Schduler = enable_short_term ? BasicScheduler : LongTermScheduler
  }

  protected override params_handler_proxy(): ProxyHandler<FSRSParameters> {
    const _this = this satisfies FSRS
    return {
      set: function (
        target: FSRSParameters,
        prop: keyof FSRSParameters,
        value: FSRSParameters[keyof FSRSParameters]
      ) {
        if (prop === 'request_retention' && Number.isFinite(value)) {
          _this.intervalModifier = _this.calculate_interval_modifier(
            Number(value)
          )
        } else if (prop === 'enable_short_term') {
          _this.Schduler = value === true ? BasicScheduler : LongTermScheduler
        }
        Reflect.set(target, prop, value)
        return true
      },
    }
  }

  /**
   * Display the collection of cards and logs for the four scenarios after scheduling the card at the current time.
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
    afterHandler?: (recordLog: RecordLog) => R
  ): R {
    const Schduler = this.Schduler
    const instace = new Schduler(card, now, this satisfies FSRSAlgorithm)
    const recordLog = instace.preview()
    if (afterHandler && typeof afterHandler === 'function') {
      return afterHandler(recordLog)
    } else {
      return recordLog as R
    }
  }

  /**
   * Display the collection of cards and logs for the card scheduled at the current time, after applying a specific grade rating.
   * @param card Card to be processed
   * @param now Current time or scheduled time
   * @param grade Rating of the review (Again, Hard, Good, Easy)
   * @param afterHandler Convert the result to another type. (Optional)
   * @example
   * ```
   * const card: Card = createEmptyCard(new Date());
   * const f = fsrs();
   * const recordLogItem = f.next(card, new Date(), Rating.Again);
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
   * interface NextRecordLog {
   *   card: CardUnChecked; //see method: createEmptyCard
   *   log: RevLogUnchecked;
   * }
   *
  function nextAfterHandler(recordLogItem: RecordLogItem) {
    const recordItem = {
      card: {
        ...(recordLogItem.card as Card & { cid: string }),
        due: recordLogItem.card.due.getTime(),
        state: State[recordLogItem.card.state] as StateType,
        last_review: recordLogItem.card.last_review
          ? recordLogItem.card.last_review!.getTime()
          : null,
      },
      log: {
        ...recordLogItem.log,
        cid: (recordLogItem.card as Card & { cid: string }).cid,
        due: recordLogItem.log.due.getTime(),
        review: recordLogItem.log.review.getTime(),
        state: State[recordLogItem.log.state] as StateType,
        rating: Rating[recordLogItem.log.rating] as RatingType,
      },
    };
    return recordItem
  }
   * const card: Card = createEmptyCard(new Date(), cardAfterHandler); //see method:  createEmptyCard
   * const f = fsrs();
   * const recordLogItem = f.repeat(card, new Date(), Rating.Again, nextAfterHandler);
   * ```
   */
  next<R = RecordLog>(
    card: CardInput | Card,
    now: DateInput,
    grade: Grade,
    afterHandler?: (recordLog: RecordLogItem) => R
  ): R {
    const Schduler = this.Schduler
    const instace = new Schduler(card, now, this satisfies FSRSAlgorithm)
    const g = TypeConvert.rating(grade)
    if (g === Rating.Manual) {
      throw new Error('Cannot review a manual rating')
    }
    const recordLogItem = instace.review(g)
    if (afterHandler && typeof afterHandler === 'function') {
      return afterHandler(recordLogItem)
    } else {
      return recordLogItem as R
    }
  }

  /**
   * Get the retrievability of the card
   * @param card  Card to be processed
   * @param now  Current time or scheduled time
   * @param format  default:true , Convert the result to another type. (Optional)
   * @returns  The retrievability of the card,if format is true, the result is a string, otherwise it is a number
   */
  get_retrievability<T extends boolean>(
    card: CardInput | Card,
    now: DateInput,
    format: T = true as T
  ): undefined | (T extends true ? string : number) {
    const processedCard = TypeConvert.card(card)
    now = TypeConvert.time(now)
    if (processedCard.state !== State.Review) {
      return undefined
    }
    const t = Math.max(now.diff(processedCard.last_review as Date, 'days'), 0)
    const r = this.forgetting_curve(t, Math.round(processedCard.stability))
    return (format ? `${(r * 100).toFixed(2)}%` : r) as T extends true
      ? string
      : number
  }

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
    afterHandler?: (prevCard: Card) => R
  ): R {
    const processedCard = TypeConvert.card(card)
    const processedLog = TypeConvert.review_log(log)
    if (processedLog.rating === Rating.Manual) {
      throw new Error('Cannot rollback a manual rating')
    }
    let last_due, last_review, last_lapses
    switch (processedLog.state) {
      case State.New:
        last_due = processedLog.due
        last_review = undefined
        last_lapses = 0
        break
      case State.Learning:
      case State.Relearning:
      case State.Review:
        last_due = processedLog.review
        last_review = processedLog.due
        last_lapses =
          processedCard.lapses -
          (processedLog.rating === Rating.Again &&
          processedLog.state === State.Review
            ? 1
            : 0)
        break
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
    }
    if (afterHandler && typeof afterHandler === 'function') {
      return afterHandler(prevCard)
    } else {
      return prevCard as R
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
    afterHandler?: (recordLogItem: RecordLogItem) => R
  ): R {
    const processedCard = TypeConvert.card(card)
    now = TypeConvert.time(now)
    const scheduled_days =
      processedCard.state === State.New
        ? 0
        : now.diff(processedCard.last_review as Date, 'days')
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
    }
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
    }
    const recordLogItem: RecordLogItem = { card: forget_card, log: forget_log }
    if (afterHandler && typeof afterHandler === 'function') {
      return afterHandler(recordLogItem)
    } else {
      return recordLogItem as R
    }
  }

  /**
   *
   * @param cards scheduled card collection
   * @param options Reschedule options,fuzz is enabled by default.If the type of due is not Date, please implement dataHandler.
   * @example
   * ```typescript
   * type CardType = Card & {
   *     cid: number;
   * };
   * const reviewCard: CardType = {
   *     cid: 1,
   *     due: new Date("2024-03-17 04:43:02"),
   *     stability: 48.26139059062234,
   *     difficulty: 5.67,
   *     elapsed_days: 18,
   *     scheduled_days: 51,
   *     reps: 8,
   *     lapses: 1,
   *     state: State.Review,
   *     last_review: new Date("2024-01-26 04:43:02"),
   * };
   * const f = fsrs();
   * const reschedule_cards = f.reschedule([reviewCard]);
   * ```
   *
   */
  reschedule<T extends CardInput | Card>(
    cards: Array<T>,
    options: RescheduleOptions = {}
  ): Array<T> {
    if (!Array.isArray(cards)) {
      throw new Error('cards must be an array')
    }
    const processedCard: T[] = []
    for (const card of cards) {
      if (TypeConvert.state(card.state) !== State.Review || !card.last_review)
        continue
      const scheduled_days = Math.floor(card.scheduled_days) as int
      const next_ivl = this.next_interval(
        +card.stability.toFixed(2),
        Math.round(card.elapsed_days),
        options.enable_fuzz ?? true
      )
      if (next_ivl === scheduled_days || next_ivl === 0) continue

      const processCard: T = { ...card }
      processCard.scheduled_days = next_ivl
      const new_due = date_scheduler(processCard.last_review!, next_ivl, true)
      if (options.dateHandler && typeof options.dateHandler === 'function') {
        processCard.due = options.dateHandler(new_due)
      } else {
        processCard.due = new_due
      }
      processedCard.push(processCard)
    }
    return processedCard
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
  return new FSRS(params || {})
}
