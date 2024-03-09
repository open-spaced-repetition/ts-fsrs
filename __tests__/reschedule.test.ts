import {
  Card,
  createEmptyCard,
  date_scheduler,
  default_maximum_interval,
  default_request_retention,
  fsrs,
  FSRS,
  State,
} from "../src/fsrs";
import { get_fuzz_range } from "../src/fsrs";

describe("FSRS reschedule", () => {
  const DECAY: number = -0.5;
  const FACTOR: number = Math.pow(0.9, 1 / DECAY) - 1;
  const request_retentions = [default_request_retention, 0.95, 0.85, 0.8];

  type CardType = Card & {
    cid: number;
  };

  function cardHandler(card: Card) {
    (card as CardType)["cid"] = 1;
    return card as CardType;
  }

  const newCard = createEmptyCard(undefined, cardHandler);
  const learningCard: CardType = {
    cid: 1,
    due: new Date(),
    stability: 0.6,
    difficulty: 5.87,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 1,
    lapses: 0,
    state: State.Learning,
    last_review: new Date("2024-03-08 05:00:00"),
  };
  const reviewCard: CardType = {
    cid: 1,
    due: new Date("2024-03-17 04:43:02"),
    stability: 48.26139059062234,
    difficulty: 5.67,
    elapsed_days: 18,
    scheduled_days: 51,
    reps: 8,
    lapses: 1,
    state: State.Review,
    last_review: new Date("2024-01-26 04:43:02"),
  };
  const relearningCard: CardType = {
    cid: 1,
    due: new Date("2024-02-15 08:43:05"),
    stability: 0.27,
    difficulty: 10,
    elapsed_days: 2,
    scheduled_days: 0,
    reps: 42,
    lapses: 8,
    state: State.Relearning,
    last_review: new Date("2024-02-15 08:38:05"),
  };

  function dateHandler(date: Date) {
    return date.getTime();
  }

  const cards = [newCard, learningCard, reviewCard, relearningCard];
  it("reschedule", () => {
    for (const requestRetention of request_retentions) {
      const f: FSRS = fsrs({ request_retention: requestRetention });
      const intervalModifier =
        (Math.pow(requestRetention, 1 / DECAY) - 1) / FACTOR;
      const reschedule_cards = f.reschedule(cards);
      if (reschedule_cards.length > 0) {
        // next_ivl !== scheduled_days
        expect(reschedule_cards.length).toBeGreaterThanOrEqual(1);
        expect(reschedule_cards[0].cid).toBeGreaterThanOrEqual(1);

        const { min_ivl, max_ivl } = get_fuzz_range(
          reviewCard.stability * intervalModifier,
          reviewCard.elapsed_days,
          default_maximum_interval,
        );
        expect(reschedule_cards[0].scheduled_days).toBeGreaterThanOrEqual(
          min_ivl,
        );
        expect(reschedule_cards[0].scheduled_days).toBeLessThanOrEqual(max_ivl);
        expect(reschedule_cards[0].due).toEqual(
          date_scheduler(
            reviewCard.last_review!,
            reschedule_cards[0].scheduled_days,
            true,
          ),
        );
      }
    }
  });

  it("reschedule[dateHandler]", () => {
    for (const requestRetention of request_retentions) {
      const f: FSRS = fsrs({ request_retention: requestRetention });
      const intervalModifier =
        (Math.pow(requestRetention, 1 / DECAY) - 1) / FACTOR;
      const [rescheduleCard] = f.reschedule([reviewCard], {
        dateHandler,
      });
      if (rescheduleCard) {
        // next_ivl !== scheduled_days
        expect(rescheduleCard.cid).toBeGreaterThanOrEqual(1);
        const { min_ivl, max_ivl } = get_fuzz_range(
          reviewCard.stability * intervalModifier,
          reviewCard.elapsed_days,
          default_maximum_interval,
        );

        expect(rescheduleCard.scheduled_days).toBeGreaterThanOrEqual(min_ivl);
        expect(rescheduleCard.scheduled_days).toBeLessThanOrEqual(max_ivl);
        expect(rescheduleCard.due as unknown as number).toEqual(
          date_scheduler(
            reviewCard.last_review!,
            rescheduleCard.scheduled_days,
            true,
          ).getTime(),
        );
        expect(typeof rescheduleCard.due).toEqual("number");
      }
    }
  });

  it("reschedule[next_ivl === scheduled_days]", () => {
    const f: FSRS = fsrs();
    const reschedule_cards = f.reschedule(
      [
        {
          cid: 1,
          due: new Date("2024-03-13 04:43:02"),
          stability: 48.26139059062234,
          difficulty: 5.67,
          elapsed_days: 18,
          scheduled_days: 48,
          reps: 8,
          lapses: 1,
          state: State.Review,
          last_review: new Date("2024-01-26 04:43:02"),
        },
      ],
      { enable_fuzz: false },
    );
    expect(reschedule_cards.length).toEqual(0);
  });
});
