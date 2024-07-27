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
    [0, 4, 17, 62, 198, 563, 0, 0, 9, 27, 74, 190, 457]
  )
  assert.deepStrictEqual(
    s_history,
    [
      3.0412, 4.17286168, 17.33942096, 62.45493874, 198.13330729, 562.55192571,
      12.93582447, 6.67353986, 9.15683242, 26.68561863, 73.74465412,
      189.50269733, 457.25808366,
    ]
  )
  assert.deepStrictEqual(
    d_history,
    [
      4.49094334, 4.26664289, 4.05746029, 3.86237659, 3.68044154, 3.51076891,
      5.21903785, 6.81216947, 6.43141837, 6.0763299, 5.74517439, 5.43633876,
      5.14831865,
    ]
  )
}

export function runShortTerm() {
  test1()
}
