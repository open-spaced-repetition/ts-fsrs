import { TypeConvert } from './convert'
import { createEmptyCard, generatorParameters } from './default'
import { FSRSValidationError } from './error'
import { date_diff } from './help'
import BasicScheduler from './impl/basic_scheduler'
import LongTermScheduler from './impl/long_term_scheduler'
import type { IFSRSModel } from './kit/index.js'
import {
  type Card,
  type CardInput,
  type DateInput,
  type FSRSHistory,
  type FSRSParameters,
  type Grade,
  Rating,
  type RecordLogItem,
  type ReviewLog,
  type ReviewLogInput,
  State,
} from './models'
import { migrateFSRS6Parameters } from './models/fsrs-6/index.js'
import { FSRS6Model } from './models/fsrs-6/model.js'
import { Reschedule } from './reschedule'
import {
  StrategyMode,
  type TSchedulerStrategy,
  type TStrategyHandler,
} from './strategies/types'
import type {
  IPreview,
  IReschedule,
  IScheduler,
  RescheduleOptions,
} from './types'

/**
 * @deprecated This interface will be removed after all tests are migrated and passing.
 * Use Scheduler going forward.
 */
export interface IFSRS {
  readonly model: IFSRSModel
  useStrategy<T extends StrategyMode>(
    mode: T,
    handler: TStrategyHandler<T>
  ): this

  clearStrategy(mode?: StrategyMode): this

  repeat(card: CardInput | Card, now: DateInput): IPreview

  next(card: CardInput | Card, now: DateInput, grade: Grade): RecordLogItem

  retrievability(card: CardInput | Card, now?: DateInput): number

  rollback(card: CardInput | Card, log: ReviewLogInput): Card

  forget(
    card: CardInput | Card,
    now: DateInput,
    reset_count?: boolean
  ): RecordLogItem

  reschedule(
    current_card: CardInput | Card,
    reviews?: FSRSHistory[],
    options?: Partial<RescheduleOptions>
  ): IReschedule
}

/**
 * @deprecated This class will be removed after all tests are migrated and passing.
 * Use Scheduler going forward.
 */
export class FSRS implements IFSRS {
  private strategyHandler = new Map<StrategyMode, TStrategyHandler>()
  private Scheduler!: TSchedulerStrategy
  #parameters!: FSRSParameters
  #model!: IFSRSModel

  constructor(parameters: Partial<FSRSParameters> = {}) {
    this.parameters = parameters
  }

  get model(): IFSRSModel {
    return this.#model
  }

  get parameters(): FSRSParameters {
    return this.#parameters
  }

  set parameters(parameters: Partial<FSRSParameters>) {
    const normalized = generatorParameters(parameters)
    this.#parameters = new Proxy(normalized, this.params_handler_proxy())
    this.rebuildModel()
    this.Scheduler = normalized.enable_short_term
      ? BasicScheduler
      : LongTermScheduler
  }

  private rebuildModel(): void {
    this.#model = FSRS6Model.create({
      config: {
        weights: this.#parameters.w as number[],
        enableShortTerm: this.#parameters.enable_short_term,
        numRelearningSteps: this.#parameters.relearning_steps.length,
      },
    })
  }

  protected params_handler_proxy(): ProxyHandler<FSRSParameters> {
    const _this = this satisfies FSRS
    return {
      set: (
        target: FSRSParameters,
        prop: keyof FSRSParameters,
        value: FSRSParameters[keyof FSRSParameters]
      ) => {
        if (prop === 'enable_short_term') {
          _this.Scheduler = value === true ? BasicScheduler : LongTermScheduler
        } else if (prop === 'w') {
          value = migrateFSRS6Parameters(
            value as number[],
            target.relearning_steps.length,
            target.enable_short_term
          )
        }
        Reflect.set(target, prop, value)
        if (prop === 'enable_short_term' || prop === 'w') {
          _this.rebuildModel()
        }
        return true
      },
    }
  }

  useStrategy<T extends StrategyMode>(
    mode: T,
    handler: TStrategyHandler<T>
  ): this {
    this.strategyHandler.set(mode, handler)
    return this
  }

  clearStrategy(mode?: StrategyMode): this {
    if (mode) {
      this.strategyHandler.delete(mode)
    } else {
      this.strategyHandler.clear()
    }
    return this
  }

  private getScheduler(card: CardInput | Card, now: DateInput): IScheduler {
    // Strategy scheduler
    const schedulerStrategy = this.strategyHandler.get(
      StrategyMode.SCHEDULER
    ) as TSchedulerStrategy | undefined

    const Scheduler = schedulerStrategy || this.Scheduler
    const instance = new Scheduler(
      card,
      now,
      this.#model,
      this.#parameters,
      this.strategyHandler
    )

    return instance
  }

  /**
   * Display the collection of cards and logs for the four scenarios after scheduling the card at the current time.
   * @param card Card to be processed
   * @param now Current time or scheduled time
   * @example
   * ```typescript
   * const card: Card = createEmptyCard(new Date());
   * const f = fsrs();
   * const recordLog = f.repeat(card, new Date());
   * ```
   */
  repeat(card: CardInput | Card, now: DateInput): IPreview {
    const instance = this.getScheduler(card, now)
    return instance.preview()
  }

  /**
   * Display the collection of cards and logs for the card scheduled at the current time, after applying a specific grade rating.
   * @param card Card to be processed
   * @param now Current time or scheduled time
   * @param grade Rating of the review (Again, Hard, Good, Easy)
   * @example
   * ```typescript
   * const card: Card = createEmptyCard(new Date());
   * const f = fsrs();
   * const recordLogItem = f.next(card, new Date(), Rating.Again);
   * ```
   */
  next(card: CardInput | Card, now: DateInput, grade: Grade): RecordLogItem {
    const instance = this.getScheduler(card, now)
    const g = TypeConvert.rating(grade)
    if (g === Rating.Manual) {
      throw new FSRSValidationError('Cannot review a manual rating')
    }
    return instance.review(g)
  }

  /**
   * Get the retrievability of the card
   * @param card  Card to be processed
   * @param now  Current time or scheduled time
   * @returns  The retrievability of the card
   */
  retrievability(card: CardInput | Card, now?: DateInput): number {
    const processedCard = TypeConvert.card(card)
    now = now ? TypeConvert.time(now) : new Date()
    const t =
      processedCard.state !== State.New
        ? Math.max(date_diff(now, processedCard.last_review as Date, 'days'), 0)
        : 0
    const r =
      processedCard.state !== State.New
        ? this.#model.forgettingCurve(processedCard, t)
        : 0
    return r
  }

  /**
   *
   * @param card Card to be processed
   * @param log last review log
   * @example
   * ```typescript
   * const now = new Date();
   * const f = fsrs();
   * const emptyCard = createEmptyCard(now);
   * const repeat = f.repeat(emptyCard, now);
   * const { card, log } = repeat[Rating.Hard];
   * const rollbackCard = f.rollback(card, log);
   * ```
   */
  rollback(card: CardInput | Card, log: ReviewLogInput): Card {
    const processedCard = TypeConvert.card(card)
    const processedLog = TypeConvert.review_log(log)
    if (processedLog.rating === Rating.Manual) {
      throw new FSRSValidationError('Cannot rollback a manual rating')
    }
    let last_due: Date
    let last_review: Date | undefined
    let last_lapses: number
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
      scheduled_days: processedLog.scheduled_days,
      reps: Math.max(0, processedCard.reps - 1),
      lapses: Math.max(0, last_lapses),
      learning_steps: processedLog.learning_steps,
      state: processedLog.state,
      last_review: last_review,
    }
    return prevCard
  }

  /**
   *
   * @param card Card to be processed
   * @param now Current time or scheduled time
   * @param reset_count Should the review count information(reps,lapses) be reset. (Optional)
   * @example
   * ```typescript
   * const now = new Date();
   * const f = fsrs();
   * const emptyCard = createEmptyCard(now);
   * const scheduling_cards = f.repeat(emptyCard, now);
   * const { card, log } = scheduling_cards[Rating.Hard];
   * const forgetCard = f.forget(card, new Date(), true);
   * ```
   */
  forget(
    card: CardInput | Card,
    now: DateInput,
    reset_count: boolean = false
  ): RecordLogItem {
    const processedCard = TypeConvert.card(card)
    now = TypeConvert.time(now)
    const scheduled_days =
      processedCard.state === State.New
        ? 0
        : date_diff(now, processedCard.due as Date, 'days')
    const forget_log: ReviewLog = {
      rating: Rating.Manual,
      state: processedCard.state,
      due: processedCard.due,
      stability: processedCard.stability,
      difficulty: processedCard.difficulty,
      scheduled_days: scheduled_days,
      learning_steps: processedCard.learning_steps,
      review: now,
    }
    const forget_card: Card = {
      ...processedCard,
      due: now,
      stability: 0,
      difficulty: 0,
      scheduled_days: 0,
      reps: reset_count ? 0 : processedCard.reps,
      lapses: reset_count ? 0 : processedCard.lapses,
      learning_steps: 0,
      state: State.New,
      last_review: processedCard.last_review,
    }
    const recordLogItem: RecordLogItem = { card: forget_card, log: forget_log }
    return recordLogItem
  }

  /**
   * Reschedules the current card and returns the rescheduled collections and reschedule item.
   *
   * @param {CardInput | Card} current_card - The current card to be rescheduled.
   * @param {Array<FSRSHistory>} reviews - The array of FSRSHistory objects representing the reviews.
   * @param {Partial<RescheduleOptions>} options - The optional reschedule options.
   * @returns {IReschedule} - The rescheduled collections and reschedule item.
   *
   * @example
   * ```typescript
   * const f = fsrs()
   * const grades: Grade[] = [Rating.Good, Rating.Good, Rating.Good, Rating.Good]
   * const reviews_at = [
   *   new Date(2024, 8, 13),
   *   new Date(2024, 8, 13),
   *   new Date(2024, 8, 17),
   *   new Date(2024, 8, 28),
   * ]
   *
   * const reviews: FSRSHistory[] = []
   * for (let i = 0; i < grades.length; i++) {
   *   reviews.push({
   *     rating: grades[i],
   *     review: reviews_at[i],
   *   })
   * }
   *
   * const results_short = scheduler.reschedule(
   *   createEmptyCard(),
   *   reviews,
   *   {
   *     skipManual: false,
   *   }
   * )
   * console.log(results_short)
   * ```
   */
  reschedule(
    current_card: CardInput | Card,
    reviews: FSRSHistory[] = [],
    options: Partial<RescheduleOptions> = {}
  ): IReschedule {
    const {
      reviewsOrderBy,
      skipManual = true,
      now = new Date(),
      update_memory_state: updateMemoryState = false,
    } = options
    if (reviewsOrderBy && typeof reviewsOrderBy === 'function') {
      reviews.sort(reviewsOrderBy)
    }
    if (skipManual) {
      reviews = reviews.filter((review) => review.rating !== Rating.Manual)
    }
    const rescheduleSvc = new Reschedule(this)

    const collections = rescheduleSvc.reschedule(
      options.first_card || createEmptyCard(),
      reviews
    )
    const len = collections.length
    const cur_card = TypeConvert.card(current_card)
    const manual_item = rescheduleSvc.calculateManualRecord(
      cur_card,
      now,
      len ? collections[len - 1] : undefined,
      updateMemoryState
    )

    return {
      collections,
      reschedule_item: manual_item ?? null,
    }
  }
}

/**
 * Create a new instance of TS-FSRS
 * @deprecated This function will be removed after all tests are migrated and passing.
 * Use Scheduler going forward.
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
