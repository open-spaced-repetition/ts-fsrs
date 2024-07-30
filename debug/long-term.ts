import assert from 'assert'
import { createEmptyCard, fsrs, Grade, Rating } from '../src/fsrs'

const f = fsrs({ enable_short_term: false })

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
    [3, 11, 36, 105, 277, 669, 13, 2, 4, 8, 15, 28, 51]
  )
  assert.deepStrictEqual(
    s_history,
    [
      3.1262, 11.38843914, 36.39366698, 105.18699429, 276.69089439,
      669.22510555, 12.54444945, 2.41539727, 4.33950844, 8.07463145,
      15.26080938, 28.22186641, 51.42879844,
    ]
  )
  assert.deepStrictEqual(
    d_history,
    [
      5.31457783, 5.26703555, 5.22060576, 5.17526243, 5.13098013, 5.08773404,
      7.12585323, 9.11628043, 8.97977831, 8.84647034, 8.71628178, 8.58913963,
      8.4649726,
    ]
  )
}

export function runLongTerm() {
  test1()
}
