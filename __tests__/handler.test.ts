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
} from '../src/fsrs'

interface CardPrismaUnChecked
  extends Omit<Card, 'due' | 'last_review' | 'state'> {
  cid: string
  due: Date | number
  last_review: Date | null | number
  state: StateType
}

interface RevLogPrismaUnchecked
  extends Omit<ReviewLog, 'due' | 'review' | 'state' | 'rating'> {
  cid: string
  due: Date | number
  state: StateType
  review: Date | number
  rating: RatingType
}

interface RepeatRecordLog {
  card: CardPrismaUnChecked
  log: RevLogPrismaUnchecked
}

describe('afterHandler', () => {
  const f: FSRS = fsrs()
  const now = new Date()

  function cardAfterHandler(card: Card) {
    return {
      ...card,
      cid: 'test001',
      state: State[card.state],
      last_review: card.last_review ?? null,
    } as CardPrismaUnChecked
  }

  function repeatAfterHandler(recordLog: RecordLog) {
    const record: RepeatRecordLog[] = []
    for (const grade of Grades) {
      record.push({
        card: {
          ...(recordLog[grade].card as Card & { cid: string }),
          due: recordLog[grade].card.due.getTime(),
          state: State[recordLog[grade].card.state] as StateType,
          last_review: recordLog[grade].card.last_review
            ? recordLog[grade].card.last_review!.getTime()
            : null,
        },
        log: {
          ...recordLog[grade].log,
          cid: (recordLog[grade].card as Card & { cid: string }).cid,
          due: recordLog[grade].log.due.getTime(),
          review: recordLog[grade].log.review.getTime(),
          state: State[recordLog[grade].log.state] as StateType,
          rating: Rating[recordLog[grade].log.rating] as RatingType,
        },
      })
    }
    return record
  }

  // function repeatAfterHandler(recordLog: RecordLog) {
  //   const record: { [key in Grade]: RepeatRecordLog } = {} as {
  //     [key in Grade]: RepeatRecordLog;
  //   };
  //   for (const grade of Grades) {
  //     record[grade] = {
  //       card: {
  //         ...(recordLog[grade].card as Card & { cid: string }),
  //         due: recordLog[grade].card.due.getTime(),
  //         state: State[recordLog[grade].card.state] as StateType,
  //         last_review: recordLog[grade].card.last_review
  //           ? recordLog[grade].card.last_review!.getTime()
  //           : null,
  //       },
  //       log: {
  //         ...recordLog[grade].log,
  //         cid: (recordLog[grade].card as Card & { cid: string }).cid,
  //         due: recordLog[grade].log.due.getTime(),
  //         review: recordLog[grade].log.review.getTime(),
  //         state: State[recordLog[grade].log.state] as StateType,
  //         rating: Rating[recordLog[grade].log.rating] as RatingType,
  //       },
  //     };
  //   }
  //   return record;
  // }
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
    }
    return recordItem
  }

  function forgetAfterHandler(recordLogItem: RecordLogItem): RepeatRecordLog {
    return {
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
    }
  }

  it('createEmptyCard[afterHandler]', () => {
    const emptyCardFormAfterHandler = createEmptyCard(now, cardAfterHandler)
    expect(emptyCardFormAfterHandler.state).toEqual('New')
    expect(fixState(emptyCardFormAfterHandler.state)).toEqual(State.New)
    expect(emptyCardFormAfterHandler.last_review).toEqual(null)
    expect(emptyCardFormAfterHandler.cid).toEqual('test001')

    const emptyCardFormAfterHandler2 = createEmptyCard<CardPrismaUnChecked>(
      now,
      cardAfterHandler
    )
    expect(emptyCardFormAfterHandler2.state).toEqual('New')
    expect(fixState(emptyCardFormAfterHandler2.state)).toEqual(State.New)
    expect(emptyCardFormAfterHandler2.last_review).toEqual(null)
    expect(emptyCardFormAfterHandler2.cid).toEqual('test001')
  })

  it('repeat[afterHandler]', () => {
    const emptyCardFormAfterHandler = createEmptyCard(now, cardAfterHandler)
    const repeat = f.repeat(emptyCardFormAfterHandler, now, repeatAfterHandler)
    expect(Array.isArray(repeat)).toEqual(true)

    for (let i = 0; i < Grades.length; i++) {
      expect(Number.isSafeInteger(repeat[i].card.due)).toEqual(true)
      expect(typeof repeat[i].card.state === 'string').toEqual(true)
      expect(Number.isSafeInteger(repeat[i].card.last_review)).toEqual(true)

      expect(Number.isSafeInteger(repeat[i].log.due)).toEqual(true)
      expect(Number.isSafeInteger(repeat[i].log.review)).toEqual(true)
      expect(typeof repeat[i].log.state === 'string').toEqual(true)
      expect(typeof repeat[i].log.rating === 'string').toEqual(true)
      expect(repeat[i].card.cid).toEqual('test001')
      expect(repeat[i].log.cid).toEqual(repeat[i].card.cid)
    }
  })

  it('next[afterHandler]', () => {
    const emptyCardFormAfterHandler = createEmptyCard(now, cardAfterHandler)
    for (const grade of Grades) {
      const next = f.next(
        emptyCardFormAfterHandler,
        now,
        grade,
        nextAfterHandler
      )
      expect('card' in next).toEqual(true)
      expect('log' in next).toEqual(true)

      expect(Number.isSafeInteger(next.card.due)).toEqual(true)
      expect(typeof next.card.state === 'string').toEqual(true)
      expect(Number.isSafeInteger(next.card.last_review)).toEqual(true)

      expect(Number.isSafeInteger(next.log.due)).toEqual(true)
      expect(Number.isSafeInteger(next.log.review)).toEqual(true)
      expect(typeof next.log.state === 'string').toEqual(true)
      expect(typeof next.log.rating === 'string').toEqual(true)
      expect(next.card.cid).toEqual('test001')
      expect(next.log.cid).toEqual(next.card.cid)
    }
  })

  it('rollback[afterHandler]', () => {
    const emptyCardFormAfterHandler = createEmptyCard(now, cardAfterHandler)
    const repeatFormAfterHandler = f.repeat(
      emptyCardFormAfterHandler,
      now,
      repeatAfterHandler
    )
    const { card, log } = repeatFormAfterHandler[Rating.Hard]
    const rollbackFromAfterHandler = f.rollback(card, log, cardAfterHandler)
    expect(rollbackFromAfterHandler).toEqual(emptyCardFormAfterHandler)
    expect(rollbackFromAfterHandler.cid).toEqual('test001')
  })

  it('forget[afterHandler]', () => {
    const emptyCardFormAfterHandler = createEmptyCard(now, cardAfterHandler)
    const repeatFormAfterHandler = f.repeat(
      emptyCardFormAfterHandler,
      now,
      repeatAfterHandler
    )
    const { card } = repeatFormAfterHandler[Rating.Hard]
    const forgetFromAfterHandler = f.forget(
      card,
      date_scheduler(now, 1, true),
      false,
      forgetAfterHandler
    )

    expect(Number.isSafeInteger(forgetFromAfterHandler.card.due)).toEqual(true)
    expect(typeof forgetFromAfterHandler.card.state === 'string').toEqual(true)
    expect(
      Number.isSafeInteger(forgetFromAfterHandler.card.last_review)
    ).toEqual(true)

    expect(Number.isSafeInteger(forgetFromAfterHandler.log.due)).toEqual(true)
    expect(Number.isSafeInteger(forgetFromAfterHandler.log.review)).toEqual(
      true
    )
    expect(typeof forgetFromAfterHandler.log.state === 'string').toEqual(true)
    expect(typeof forgetFromAfterHandler.log.rating === 'string').toEqual(true)
    expect(forgetFromAfterHandler.card.cid).toEqual('test001')
    expect(forgetFromAfterHandler.log.cid).toEqual(
      forgetFromAfterHandler.card.cid
    )
  })
})
