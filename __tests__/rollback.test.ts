import { createEmptyCard, fsrs, FSRS, Rating } from "../src/fsrs";

describe("FSRS rollback", () => {
  const f: FSRS = fsrs({
    w: [
      1.14, 1.01, 5.44, 14.67, 5.3024, 1.5662, 1.2503, 0.0028, 1.5489, 0.1763,
      0.9953, 2.7473, 0.0179, 0.3105, 0.3976, 0.0, 2.0902,
    ],
    enable_fuzz: false,
  });
  it("first rollback", () => {
    const card = createEmptyCard();
    const now = new Date(2022, 11, 29, 12, 30, 0, 0);
    const scheduling_cards = f.repeat(card, now);
    const grade = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy];
    for (const rating of grade) {
      const rollbackCard = f.rollback(
        scheduling_cards[rating].card,
        scheduling_cards[rating].log,
      );
      expect(rollbackCard).toEqual(card);
    }
  });

  it("rollback 2", () => {
    let card = createEmptyCard();
    let now = new Date(2022, 11, 29, 12, 30, 0, 0);
    let scheduling_cards = f.repeat(card, now);
    card = scheduling_cards["4"].card;
    now = card.due;
    scheduling_cards = f.repeat(card, now);
    const grade = [Rating.Again, Rating.Hard, Rating.Good,Rating.Easy];
    for (const rating of grade) {
      const rollbackCard = f.rollback(
        scheduling_cards[rating].card,
        scheduling_cards[rating].log,
      );
      expect(rollbackCard).toEqual(card);
    }
  });
});
