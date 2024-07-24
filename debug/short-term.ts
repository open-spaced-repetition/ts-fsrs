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
    [0, 4, 17, 57, 163, 412, 0, 0, 8, 15, 27, 49, 86]
  )
  assert.deepStrictEqual(
    s_history,
    [
      3.0412, 4.17286168, 16.55123695, 56.74378762, 163.35708827, 411.77071586,
      11.15423471, 5.75442486, 7.89570531, 14.90748589, 27.437534, 48.90521597,
      85.82782993,
    ]
  )
  assert.deepStrictEqual(
    d_history,
    [
      4.49094334, 4.66971892, 4.83644502, 4.99193379, 5.13694261, 5.27217784,
      7.26480385, 9.12312687, 8.98969328, 8.86525311, 8.74920021, 8.64096928,
      8.54003311,
    ]
  )
}

export function runShortTerm() {
  test1()
}
