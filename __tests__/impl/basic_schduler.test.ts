import {
  createEmptyCard,
  FSRSAlgorithm,
  generatorParameters,
  Grade,
  Rating,
} from '../../src/fsrs'
import BasicScheduler from '../../src/fsrs/impl/basic_schduler'

describe('basic schduler', () => {
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
    })
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
    })
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
    })
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
