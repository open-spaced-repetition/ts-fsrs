import { Rating } from '@open-spaced-repetition/srs-kit'
import { bench, describe } from 'vitest'

type Review = { readonly rating: Rating; readonly reviewTime: number }
type ModelReview = { rating: Rating; deltaT: number }

const ratings = [Rating.Good, Rating.Hard, Rating.Easy, Rating.Again] as const
const difference = (from: number, to: number): number => to - from

function makeHistory(size: number): Review[] {
  return Array.from({ length: size }, (_, index) => ({
    rating: ratings[index % ratings.length],
    reviewTime: index,
  }))
}

function withPush(history: readonly Review[]): ModelReview[] {
  const modelHistory: ModelReview[] = [{ rating: history[0].rating, deltaT: 0 }]
  let previousReviewTime = history[0].reviewTime

  for (let index = 1; index < history.length; index++) {
    const review = history[index]
    const deltaT = difference(previousReviewTime, review.reviewTime)

    if (!Number.isFinite(deltaT) || deltaT < 0) {
      throw new Error('invalid interval')
    }

    previousReviewTime = review.reviewTime
    modelHistory.push({ rating: review.rating, deltaT })
  }

  return modelHistory
}

function withPreallocation(history: readonly Review[]): ModelReview[] {
  const modelHistory: ModelReview[] = new Array(history.length)
  modelHistory[0] = { rating: history[0].rating, deltaT: 0 }
  let previousReviewTime = history[0].reviewTime

  for (let index = 1; index < history.length; index++) {
    const review = history[index]
    const deltaT = difference(previousReviewTime, review.reviewTime)

    if (!Number.isFinite(deltaT) || deltaT < 0) {
      throw new Error('invalid interval')
    }

    previousReviewTime = review.reviewTime
    modelHistory[index] = { rating: review.rating, deltaT }
  }

  return modelHistory
}

let sink = 0

function consume(modelHistory: ModelReview[]): void {
  sink = (sink + modelHistory[modelHistory.length - 1].deltaT) % 1024
}

for (const size of [10, 100, 1000]) {
  const history = makeHistory(size)

  describe(`prepareHistory ${size} reviews`, () => {
    bench('push', () => {
      consume(withPush(history))
    })

    bench('preallocated new Array(n)', () => {
      consume(withPreallocation(history))
    })
  })
}
