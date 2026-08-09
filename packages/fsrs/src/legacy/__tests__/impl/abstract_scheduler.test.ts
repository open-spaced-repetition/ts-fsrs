import {
  createEmptyCard,
  fsrs,
  type Grade,
  type IPreview,
  Rating,
} from 'ts-fsrs'

describe('basic scheduler', () => {
  const now = new Date()

  it('[Symbol.iterator]', () => {
    const card = createEmptyCard(now)
    const f = fsrs()
    const preview = f.repeat(card, now)
    const again = f.next(card, now, Rating.Again)
    const hard = f.next(card, now, Rating.Hard)
    const good = f.next(card, now, Rating.Good)
    const easy = f.next(card, now, Rating.Easy)

    const expect_preview = {
      [Rating.Again]: again,
      [Rating.Hard]: hard,
      [Rating.Good]: good,
      [Rating.Easy]: easy,
      [Symbol.iterator]: preview[Symbol.iterator],
    } satisfies IPreview
    expect(preview).toEqual(expect_preview)
    for (const item of preview) {
      expect(item).toEqual(expect_preview[<Grade>item.log.rating])
    }
    const iterator = preview[Symbol.iterator]()
    expect(iterator.next().value).toEqual(again)
    expect(iterator.next().value).toEqual(hard)
    expect(iterator.next().value).toEqual(good)
    expect(iterator.next().value).toEqual(easy)
    expect(iterator.next().done).toBeTruthy()
  })
})
