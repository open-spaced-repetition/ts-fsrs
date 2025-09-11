import assert from 'assert'
import { createEmptyCard, fsrs, Grade, Rating } from 'ts-fsrs'

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
    [
      3, 11, 35, 101, 269, 669,
      12, 2, 5, 12, 26, 55,
      112
    ]
  )
  assert.deepStrictEqual(
    s_history,
    [
      3.173, 10.73892592,
      34.57762416, 100.74831139,
      269.283835, 669.30934162,
      11.89873732, 2.23603312,
      5.20013908, 11.89928679,
      26.49170577, 55.49486382,
      111.97264222
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

export function runLongTerm() {
  test1()
}
