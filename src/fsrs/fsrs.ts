import { SchedulingCard } from "./scheduler";
import { fixDate, fixRating, fixState } from "./help";
import {
  Card,
  CardInput,
  DateInput,
  FSRSParameters,
  Rating,
  RecordLog,
  RecordLogItem,
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

  private preProcessCard(_card: CardInput): Card {
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

  private preProcessLog(_log: ReviewLogInput): ReviewLog {
    return {
      ..._log,
      rating: fixRating(_log.rating),
      state: fixState(_log.state),
      review: fixDate(_log.review),
    };
  }

  repeat = (card: CardInput, now: DateInput): RecordLog => {
    card = this.preProcessCard(card);
    now = this.preProcessDate(now);
    const s = new SchedulingCard(card, now).update_state(card.state);
    this.seed = String(now.getTime()) + String(card.reps);
    let easy_interval, good_interval, hard_interval;
    switch (card.state) {
      case State.New:
        this.init_ds(s);
        s.again.due = now.scheduler(1 as int);
        s.hard.due = now.scheduler(5 as int);
        s.good.due = now.scheduler(10 as int);
        easy_interval = this.next_interval(s.easy.stability);
        s.easy.scheduled_days = easy_interval;
        s.easy.due = now.scheduler(easy_interval, true);
        break;
      case State.Learning:
      case State.Relearning:
        hard_interval = 0;
        good_interval = this.next_interval(s.good.stability);
        easy_interval = Math.max(
          this.next_interval(s.easy.stability),
          good_interval + 1,
        );
        s.schedule(now, hard_interval, good_interval, easy_interval);
        break;
      case State.Review: {
        const interval = card.elapsed_days;
        const last_d = card.difficulty;
        const last_s = card.stability;
        const retrievability = this.current_retrievability(interval, last_s);
        this.next_ds(s, last_d, last_s, retrievability);
        hard_interval = this.next_interval(s.hard.stability);
        good_interval = this.next_interval(s.good.stability);
        hard_interval = Math.min(hard_interval, good_interval);
        good_interval = Math.max(good_interval, hard_interval + 1);
        easy_interval = Math.max(
          this.next_interval(s.easy.stability),
          good_interval + 1,
        );
        s.schedule(now, hard_interval, good_interval, easy_interval);
        break;
      }
    }
    return s.record_log(card, now);
  };

  get_retrievability = (card: Card, now: Date): undefined | string => {
    card = this.preProcessCard(card);
    now = this.preProcessDate(now);
    if (card.state !== State.Review) {
      return undefined;
    }
    const t = Math.max(now.diff(card.last_review as Date, "days"), 0);
    return (
      (this.current_retrievability(t, card.stability) * 100).toFixed(2) + "%"
    );
  };

  rollback = (card: CardInput, log: ReviewLogInput): Card => {
    card = this.preProcessCard(card);
    log = this.preProcessLog(log);
    if (log.rating === Rating.Manual) {
      throw new Error("Cannot rollback a manual rating");
    }
    let last_due, last_review, last_lapses;
    switch (log.state) {
      case State.New:
        last_due = log.due;
        last_review = undefined;
        last_lapses = 0;
        break;
      case State.Learning:
      case State.Relearning:
      case State.Review:
        last_due = log.review;
        last_review = log.due;
        last_lapses =
          card.lapses -
          (log.rating === Rating.Again && log.state === State.Review ? 1 : 0);
        break;
    }

    return {
      ...card,
      due: last_due,
      stability: log.stability,
      difficulty: log.difficulty,
      elapsed_days: log.elapsed_days,
      scheduled_days: log.scheduled_days,
      reps: Math.max(0, card.reps - 1),
      lapses: Math.max(0, last_lapses),
      state: log.state,
      last_review: last_review,
    };
  };

  forget = (
    card: CardInput,
    now: DateInput,
    reset_count: boolean = false,
  ): RecordLogItem => {
    card = this.preProcessCard(card);
    now = this.preProcessDate(now);
    const forget_log: ReviewLog = {
      rating: Rating.Manual,
      state: card.state,
      due: card.due,
      stability: card.stability,
      difficulty: card.difficulty,
      elapsed_days: card.elapsed_days,
      scheduled_days: card.scheduled_days,
      review: now,
    };
    const forget_card: Card = {
      ...card,
      due: now,
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: reset_count ? 0 : card.reps,
      lapses: reset_count ? 0 : card.lapses,
      state: State.New,
      last_review: card.last_review,
    };
    return { card: forget_card, log: forget_log };
  };
}
