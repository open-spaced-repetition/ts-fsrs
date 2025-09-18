// Ref:https://github.com/ishiko732/ts-fsrs/issues/44

import {
  createEmptyCard,
  date_diff,
  type FSRS,
  fsrs,
  type Grade,
  Rating,
  type ReviewLog,
} from 'ts-fsrs'

describe('elapsed_days', () => {
  const f: FSRS = fsrs()

  const createDue = new Date(Date.UTC(2023, 9, 18, 14, 32, 3, 370))
  const grades: Grade[] = [Rating.Good, Rating.Again, Rating.Again, Rating.Good]
  let currentLog: ReviewLog | null = null
  let index = 0
  let card = createEmptyCard(createDue)
  test('first repeat[Rating.Good]', () => {
    const firstDue = new Date(Date.UTC(2023, 10, 5, 8, 27, 2, 605))
    const sc = f.repeat(card, firstDue)
    currentLog = sc[grades[index]].log

    expect(currentLog.elapsed_days).toEqual(0)
    // console.log(sc[grades[index]].log)
    card = sc[grades[index]].card
    // console.log(card)
    index += 1
  })

  test('second repeat[Rating.Again]', () => {
    // 2023-11-08 15:02:09.791,4.93,2023-11-05 08:27:02.605
    const secondDue = new Date(Date.UTC(2023, 10, 8, 15, 2, 9, 791))
    expect(card).not.toBeNull()
    const sc = f.repeat(card, secondDue)

    currentLog = sc[grades[index]].log
    expect(currentLog.elapsed_days).toEqual(
      date_diff(secondDue, card.last_review as Date, 'days')
    ) // 3
    expect(currentLog.elapsed_days).toEqual(3) // 0
    card = sc[grades[index]].card
    // console.log(card)
    // console.log(currentLog)
    index += 1
  })

  test('third repeat[Rating.Again]', () => {
    // 2023-11-08 15:02:30.799,4.93,2023-11-08 15:02:09.791
    const secondDue = new Date(Date.UTC(2023, 10, 8, 15, 2, 30, 799))
    expect(card).not.toBeNull()
    const sc = f.repeat(card, secondDue)

    currentLog = sc[grades[index]].log
    expect(currentLog.elapsed_days).toEqual(
      date_diff(secondDue, card.last_review as Date, 'days')
    ) // 0
    expect(currentLog.elapsed_days).toEqual(0) // 0
    // console.log(currentLog);
    card = sc[grades[index]].card
    // console.log(card);
    index += 1
  })

  test('fourth repeat[Rating.Good]', () => {
    // 2023-11-08 15:04:08.739,4.93,2023-11-08 15:02:30.799
    const secondDue = new Date(Date.UTC(2023, 10, 8, 15, 4, 8, 739))
    expect(card).not.toBeNull()
    const sc = f.repeat(card, secondDue)

    currentLog = sc[grades[index]].log
    expect(currentLog.elapsed_days).toEqual(
      date_diff(secondDue, card.last_review as Date, 'days')
    ) // 0
    expect(currentLog.elapsed_days).toEqual(0) // 0
    // console.log(currentLog);
    card = sc[grades[index]].card
    // console.log(card);
    index += 1
  })
})
