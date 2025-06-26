import {
  createEmptyCard,
  FSRSAlgorithm,
  type Grade,
  generatorParameters,
  Rating,
} from '../../src/fsrs'
import BasicScheduler from '../../src/fsrs/impl/basic_scheduler'

describe('basic scheduler', () => {
  const params = generatorParameters()
  const algorithm = new FSRSAlgorithm(params)
  const now = new Date()

  it('[State.New]exist', () => {
    const card = createEmptyCard(now)
    const basicScheduler = new BasicScheduler(card, now, algorithm)
    const preview = basicScheduler.preview()
    const again = basicScheduler.review(Rating.Again)
    const hard = basicScheduler.review(Rating.Hard)
    const good = basicScheduler.review(Rating.Good)
    const easy = basicScheduler.review(Rating.Easy)
    expect(preview).toEqual({
      [Rating.Again]: again,
      [Rating.Hard]: hard,
      [Rating.Good]: good,
      [Rating.Easy]: easy,
      // biome-ignore lint/complexity/useLiteralKeys: access private variables
      [Symbol.iterator]: basicScheduler[`previewIterator`].bind(basicScheduler),
    })
    for (const item of preview) {
      expect(item).toEqual(basicScheduler.review(<Grade>item.log.rating))
    }
    const iterator = preview[Symbol.iterator]()
    expect(iterator.next().value).toEqual(again)
    expect(iterator.next().value).toEqual(hard)
    expect(iterator.next().value).toEqual(good)
    expect(iterator.next().value).toEqual(easy)
    expect(iterator.next().done).toBeTruthy()
  })
  it('[State.New]invalid grade', () => {
    const card = createEmptyCard(now)
    const basicScheduler = new BasicScheduler(card, now, algorithm)
    expect(() => basicScheduler.review('invalid' as unknown as Grade)).toThrow(
      'Invalid grade'
    )
  })

  it('[State.Learning]exist', () => {
    const cardByNew = createEmptyCard(now)
    const { card } = new BasicScheduler(cardByNew, now, algorithm).review(
      Rating.Again
    )
    const basicScheduler = new BasicScheduler(card, now, algorithm)

    const preview = basicScheduler.preview()
    const again = basicScheduler.review(Rating.Again)
    const hard = basicScheduler.review(Rating.Hard)
    const good = basicScheduler.review(Rating.Good)
    const easy = basicScheduler.review(Rating.Easy)
    expect(preview).toEqual({
      [Rating.Again]: again,
      [Rating.Hard]: hard,
      [Rating.Good]: good,
      [Rating.Easy]: easy,
      // biome-ignore lint/complexity/useLiteralKeys: access private variables
      [Symbol.iterator]: basicScheduler[`previewIterator`].bind(basicScheduler),
    })
    for (const item of preview) {
      expect(item).toEqual(basicScheduler.review(<Grade>item.log.rating))
    }
  })
  it('[State.Learning]invalid grade', () => {
    const cardByNew = createEmptyCard(now)
    const { card } = new BasicScheduler(cardByNew, now, algorithm).review(
      Rating.Again
    )
    const basicScheduler = new BasicScheduler(card, now, algorithm)
    expect(() => basicScheduler.review('invalid' as unknown as Grade)).toThrow(
      'Invalid grade'
    )
  })

  it('[State.Review]exist', () => {
    const cardByNew = createEmptyCard(now)
    const { card } = new BasicScheduler(cardByNew, now, algorithm).review(
      Rating.Easy
    )
    const basicScheduler = new BasicScheduler(card, now, algorithm)

    const preview = basicScheduler.preview()
    const again = basicScheduler.review(Rating.Again)
    const hard = basicScheduler.review(Rating.Hard)
    const good = basicScheduler.review(Rating.Good)
    const easy = basicScheduler.review(Rating.Easy)
    expect(preview).toEqual({
      [Rating.Again]: again,
      [Rating.Hard]: hard,
      [Rating.Good]: good,
      [Rating.Easy]: easy,
      // biome-ignore lint/complexity/useLiteralKeys: access private variables
      [Symbol.iterator]: basicScheduler[`previewIterator`].bind(basicScheduler),
    })
    for (const item of preview) {
      expect(item).toEqual(basicScheduler.review(<Grade>item.log.rating))
    }
  })
  it('[State.Review]invalid grade', () => {
    const cardByNew = createEmptyCard(now)
    const { card } = new BasicScheduler(cardByNew, now, algorithm).review(
      Rating.Easy
    )
    const basicScheduler = new BasicScheduler(card, now, algorithm)
    expect(() => basicScheduler.review('invalid' as unknown as Grade)).toThrow(
      'Invalid grade'
    )
  })
})
