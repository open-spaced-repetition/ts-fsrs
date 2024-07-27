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
    [0, 4, 15, 48, 136, 351, 0, 0, 7, 13, 24, 43, 77]
  )
  assert.deepStrictEqual(
    s_history,
    [
      3.1262, 4.35097949, 14.94870008, 47.78790366, 136.29251941, 351.35118365,
      9.99090459, 5.08074507, 7.07127426, 13.09253023, 23.92805755, 43.23645988,
      76.59611345,
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

export function runShortTerm() {
  test1()
}
