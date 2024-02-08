import {
  Card,
  createEmptyCard,
  date_scheduler,
  fixState,
  fsrs,
  FSRS,
  Grades,
  Rating,
  RatingType,
  RecordLog,
  RecordLogItem,
  ReviewLog,
  State,
  StateType,
} from "../src/fsrs";

interface CardPrismaUnChecked
  extends Omit<Card, "due" | "last_review" | "state"> {
  due: Date | number;
  last_review: Date | null | number;
  state: StateType;
}

interface RevLogPrismaUnchecked
  extends Omit<ReviewLog, "due" | "review" | "state" | "rating"> {
  due: Date | number;
  state: StateType;
  review: Date | number;
  rating: RatingType;
}

interface RepeatRecordLog {
  card: CardPrismaUnChecked;
  log: RevLogPrismaUnchecked;
}

describe("afterHandler", () => {
  const f: FSRS = fsrs();
  const now = new Date();

  function cardAfterHandler(card: Card) {
    return {
      ...card,
      state: State[card.state],
      last_review: card.last_review ?? null,
    } as CardPrismaUnChecked;
  }

  function repeatAfterHandler(recordLog: RecordLog) {
    const record: RepeatRecordLog[] = [];
    for (const grade of Grades) {
      record.push({
        card: {
          ...recordLog[grade].card,
          due: recordLog[grade].card.due.getTime(),
          state: State[recordLog[grade].card.state] as StateType,
          last_review: recordLog[grade].card.last_review
            ? recordLog[grade].card.last_review!.getTime()
            : null,
        },
        log: {
          ...recordLog[grade].log,
          due: recordLog[grade].log.due.getTime(),
          review: recordLog[grade].log.review.getTime(),
          state: State[recordLog[grade].log.state] as StateType,
          rating: Rating[recordLog[grade].log.rating] as RatingType,
        },
      });
    }
    return record;
  }

  function forgetAfterHandler(recordLogItem: RecordLogItem): RepeatRecordLog {
    return {
      card: {
        ...recordLogItem.card,
        due: recordLogItem.card.due.getTime(),
        state: State[recordLogItem.card.state] as StateType,
        last_review: recordLogItem.card.last_review
          ? recordLogItem.card.last_review!.getTime()
          : null,
      },
      log: {
        ...recordLogItem.log,
        due: recordLogItem.log.due.getTime(),
        review: recordLogItem.log.review.getTime(),
        state: State[recordLogItem.log.state] as StateType,
        rating: Rating[recordLogItem.log.rating] as RatingType,
      },
    };
  }

  it("createEmptyCard[afterHandler]", () => {
    const emptyCardFormAfterHandler = createEmptyCard(now, cardAfterHandler);
    expect(emptyCardFormAfterHandler.state).toEqual("New");
    expect(fixState(emptyCardFormAfterHandler.state)).toEqual(State.New);
    expect(emptyCardFormAfterHandler.last_review).toEqual(null);

    const emptyCardFormAfterHandler2 = createEmptyCard<CardPrismaUnChecked>(now, cardAfterHandler);
    expect(emptyCardFormAfterHandler2.state).toEqual("New");
    expect(fixState(emptyCardFormAfterHandler2.state)).toEqual(State.New);
    expect(emptyCardFormAfterHandler2.last_review).toEqual(null);
  });

  it("repeat[afterHandler]", () => {
    const emptyCardFormAfterHandler = createEmptyCard(now, cardAfterHandler);
    const repeat = f.repeat(emptyCardFormAfterHandler, now, repeatAfterHandler);
    expect(Array.isArray(repeat)).toEqual(true);

    for (let i = 0; i < Grades.length; i++) {
      expect(Number.isSafeInteger(repeat[i].card.due)).toEqual(true);
      expect(typeof repeat[i].card.state === "string").toEqual(true);
      expect(Number.isSafeInteger(repeat[i].card.last_review)).toEqual(true);

      expect(Number.isSafeInteger(repeat[i].log.due)).toEqual(true);
      expect(Number.isSafeInteger(repeat[i].log.review)).toEqual(true);
      expect(typeof repeat[i].log.state === "string").toEqual(true);
      expect(typeof repeat[i].log.rating === "string").toEqual(true);
    }
  });

  it("rollback[afterHandler]", () => {
    const emptyCardFormAfterHandler = createEmptyCard(now, cardAfterHandler);
    const repeatFormAfterHandler = f.repeat(emptyCardFormAfterHandler, now, repeatAfterHandler);
    const { card, log } = repeatFormAfterHandler[Rating.Hard];
    const rollbackFromAfterHandler = f.rollback(card, log, cardAfterHandler);
    expect(rollbackFromAfterHandler).toEqual(emptyCardFormAfterHandler);
  });

  it("forget[afterHandler]", () => {
    const emptyCardFormAfterHandler = createEmptyCard(now, cardAfterHandler);
    const repeatFormAfterHandler = f.repeat(emptyCardFormAfterHandler, now, repeatAfterHandler);
    const { card} = repeatFormAfterHandler[Rating.Hard];
    const forgetFromAfterHandler = f.forget(card, date_scheduler(now, 1, true), false, forgetAfterHandler);

    expect(Number.isSafeInteger(forgetFromAfterHandler.card.due)).toEqual(true);
    expect(typeof forgetFromAfterHandler.card.state === "string").toEqual(true);
    expect(
      Number.isSafeInteger(forgetFromAfterHandler.card.last_review),
    ).toEqual(true);

    expect(Number.isSafeInteger(forgetFromAfterHandler.log.due)).toEqual(true);
    expect(Number.isSafeInteger(forgetFromAfterHandler.log.review)).toEqual(
      true,
    );
    expect(typeof forgetFromAfterHandler.log.state === "string").toEqual(true);
    expect(typeof forgetFromAfterHandler.log.rating === "string").toEqual(true);
  });
});
