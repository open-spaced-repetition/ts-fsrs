import assert from 'assert'
import { createEmptyCard, fsrs, Grade, Rating } from '../src/fsrs'

const f = fsrs()

function test1() {
  let card = createEmptyCard()
  let now = new Date(2022, 11, 29, 12, 30, 0, 0)
  const ratings: Grade[] = [
    Rating.Good,
    Rating.Good,
    Rating.Good,
    Rating.Good,
    Rating.Good,
    Rating.Good,
    Rating.Again,
    Rating.Again,
    Rating.Good,
    Rating.Good,
    Rating.Good,
    Rating.Good,
    Rating.Good,
  ]
  const ivl_history: number[] = []
  const s_history: number[] = []
  const d_history: number[] = []
  for (const rating of ratings) {
    const record = f.repeat(card, now)[rating]
    card = record.card
    ivl_history.push(card.scheduled_days)
    s_history.push(card.stability)
    d_history.push(card.difficulty)
    now = card.due
  }

  assert.deepStrictEqual(
    ivl_history,
    [
      0, 4, 14, 44, 125, 328,
      0, 0, 7, 16, 34, 71,
      142
    ]
  )
  assert.deepStrictEqual(
    s_history,
    [
      3.173, 4.46685806,
      14.21728391, 43.7250927,
      124.79655286, 328.47343304,
      9.25594883, 4.63749438,
      6.5285311, 15.55546765,
      34.36241506, 71.10191819,
      141.83400645
    ]
  )
  assert.deepStrictEqual(
    d_history,
    [
      5.28243442, 5.27296793,
      5.26354498, 5.25416538,
      5.24482893, 5.23553542,
      6.76539959, 7.79401833,
      7.77299855, 7.75207546,
      7.73124862, 7.71051758,
      7.68988191
    ]
  )
}

export function runShortTerm() {
  test1()
}
