import { DEFAULT_PARAMETERS, INIT_S_MAX, S_MIN } from './constants'
import type { FSRSItem } from './types'

type AverageRecall = {
  deltaT: number
  recall: number
  count: number
}

type Rating = number
type Count = number

const DEFAULT_STABILITY_BY_RATING = new Map<number, number>([
  [1, DEFAULT_PARAMETERS[0]],
  [2, DEFAULT_PARAMETERS[1]],
  [3, DEFAULT_PARAMETERS[2]],
  [4, DEFAULT_PARAMETERS[3]],
])

export function initializeStabilityParameters(
  items: readonly FSRSItem[],
  averageRecall: number
): [[number, number, number, number], Map<Rating, Count>] {
  const dataset = prepareDatasetForInitialization(items)
  const ratingCount = totalRatingCount(dataset)
  const ratingStability = searchParameters(dataset, averageRecall)
  return [smoothAndFill(ratingStability, ratingCount), ratingCount]
}

function prepareDatasetForInitialization(
  items: readonly FSRSItem[]
): Map<Rating, AverageRecall[]> {
  const groups = new Map<Rating, Map<number, number[]>>()

  for (const item of items) {
    if (item.longTermReviewCnt() !== 1) {
      continue
    }
    const firstRating = item.reviews[0]?.rating
    const firstLongTermReview = item.firstLongTermReview()
    const firstLongTermDeltaT = firstLongTermReview.deltaT
    const firstLongTermLabel = firstLongTermReview.rating > 1 ? 1 : 0

    if (firstRating == null) {
      continue
    }

    const ratingGroup = groups.get(firstRating) ?? new Map<number, number[]>()
    groups.set(firstRating, ratingGroup)
    const ratings = ratingGroup.get(firstLongTermDeltaT) ?? []
    ratings.push(firstLongTermLabel)
    ratingGroup.set(firstLongTermDeltaT, ratings)
  }

  const results = new Map<Rating, AverageRecall[]>()
  for (const [firstRating, inner] of groups) {
    const data: AverageRecall[] = []
    for (const [deltaT, ratings] of inner) {
      const recall =
        ratings.reduce((sum, value) => sum + value, 0) / ratings.length
      data.push({
        deltaT,
        recall,
        count: ratings.length,
      })
    }
    data.sort((left, right) => left.deltaT - right.deltaT)
    results.set(firstRating, data)
  }

  return results
}

function totalRatingCount(
  datasetForInitialization: Map<Rating, AverageRecall[]>
): Map<Rating, Count> {
  const counts = new Map<Rating, Count>()
  for (const [rating, data] of datasetForInitialization) {
    counts.set(
      rating,
      data.reduce((sum, value) => sum + value.count, 0)
    )
  }
  return counts
}

function powerForgettingCurve(
  deltaTs: readonly number[],
  stability: number
): number[] {
  const decay = -DEFAULT_PARAMETERS[20]
  const factor = Math.pow(0.9, 1 / decay) - 1
  return deltaTs.map((deltaT) =>
    Math.pow((deltaT / stability) * factor + 1, decay)
  )
}

function loss(
  deltaTs: readonly number[],
  recalls: readonly number[],
  counts: readonly number[],
  initS0: number,
  defaultS0: number
): number {
  const predictions = powerForgettingCurve(deltaTs, initS0)
  let logLoss = 0
  for (let index = 0; index < predictions.length; index++) {
    const prediction = predictions[index]
    const recall = recalls[index]
    const count = counts[index]
    logLoss +=
      -(
        recall * Math.log(prediction) +
        (1 - recall) * Math.log(1 - prediction)
      ) * count
  }
  const l1 = Math.abs(initS0 - defaultS0) / 16.0
  return logLoss + l1
}

function searchParameters(
  datasetForInitialization: Map<Rating, AverageRecall[]>,
  averageRecall: number
): Map<Rating, number> {
  const optimal = new Map<Rating, number>()
  const epsilon = Number.EPSILON

  for (const [firstRating, data] of datasetForInitialization) {
    const defaultS0 = DEFAULT_STABILITY_BY_RATING.get(firstRating)
    if (defaultS0 == null) {
      continue
    }

    const deltaTs = data.map((value) => value.deltaT)
    const counts = data.map((value) => value.count)
    const recalls = data.map((value) => {
      return (value.recall * value.count + averageRecall) / (value.count + 1.0)
    })

    let low = S_MIN
    let high = INIT_S_MAX
    let optimalS = defaultS0
    let iteration = 0

    while (high - low > epsilon && iteration < 1000) {
      iteration += 1
      const mid1 = low + (high - low) / 3.0
      const mid2 = high - (high - low) / 3.0
      const loss1 = loss(deltaTs, recalls, counts, mid1, defaultS0)
      const loss2 = loss(deltaTs, recalls, counts, mid2, defaultS0)

      if (loss1 < loss2) {
        high = mid2
      } else {
        low = mid1
      }

      optimalS = (high + low) / 2.0
    }

    optimal.set(firstRating, optimalS)
  }

  return optimal
}

export function smoothAndFill(
  ratingStability: Map<Rating, number>,
  ratingCount: Map<Rating, Count>
): [number, number, number, number] {
  const filtered = new Map<Rating, number>()
  for (const [key, value] of ratingStability) {
    if (ratingCount.has(key)) {
      filtered.set(key, value)
    }
  }

  for (const [smallRating, bigRating] of [
    [1, 2],
    [2, 3],
    [3, 4],
    [1, 3],
    [2, 4],
    [1, 4],
  ] as const) {
    const smallValue = filtered.get(smallRating)
    const bigValue = filtered.get(bigRating)
    const smallCount = ratingCount.get(smallRating)
    const bigCount = ratingCount.get(bigRating)
    if (
      smallValue == null ||
      bigValue == null ||
      smallCount == null ||
      bigCount == null
    ) {
      continue
    }
    if (smallValue > bigValue) {
      if (smallCount > bigCount) {
        filtered.set(bigRating, smallValue)
      } else {
        filtered.set(smallRating, bigValue)
      }
    }
  }

  const w1 = 0.41
  const w2 = 0.54

  const arr: Array<number | undefined> = [
    undefined,
    filtered.get(1),
    filtered.get(2),
    filtered.get(3),
    filtered.get(4),
  ]

  let initS0: number[] = []
  switch (filtered.size) {
    case 0:
      throw new Error('Not enough data to initialize stability parameters')
    case 1: {
      const [rating, value] = filtered.entries().next().value as [
        number,
        number,
      ]
      const defaultValue = DEFAULT_STABILITY_BY_RATING.get(rating)
      if (defaultValue == null) {
        throw new Error(`Unknown rating: ${rating}`)
      }
      const factor = value / defaultValue
      initS0 = []
      for (const item of DEFAULT_STABILITY_BY_RATING.values()) {
        initS0.push(item * factor)
      }
      initS0.sort((left, right) => left - right)
      break
    }
    case 2: {
      if (
        arr[1] == null &&
        arr[2] == null &&
        arr[3] != null &&
        arr[4] != null
      ) {
        const r2 =
          Math.pow(arr[3], 1 / (1 - w2)) * Math.pow(arr[4], 1 - 1 / (1 - w2))
        arr[2] = r2
        arr[1] = Math.pow(r2, 1 / w1) * Math.pow(arr[3], 1 - 1 / w1)
      } else if (
        arr[1] == null &&
        arr[2] != null &&
        arr[3] == null &&
        arr[4] != null
      ) {
        const r3 = Math.pow(arr[2], 1 - w2) * Math.pow(arr[4], w2)
        arr[3] = r3
        arr[1] = Math.pow(arr[2], 1 / w1) * Math.pow(r3, 1 - 1 / w1)
      } else if (
        arr[1] == null &&
        arr[2] != null &&
        arr[3] != null &&
        arr[4] == null
      ) {
        arr[4] = Math.pow(arr[2], 1 - 1 / w2) * Math.pow(arr[3], 1 / w2)
        arr[1] = Math.pow(arr[2], 1 / w1) * Math.pow(arr[3], 1 - 1 / w1)
      } else if (
        arr[1] != null &&
        arr[2] == null &&
        arr[3] == null &&
        arr[4] != null
      ) {
        const denominator = w1 * -w2 + w1 + w2
        const r2 =
          Math.pow(arr[1], w1 / denominator) *
          Math.pow(arr[4], 1 - w1 / denominator)
        arr[2] = r2
        arr[3] =
          Math.pow(arr[1], 1 - w2 / denominator) *
          Math.pow(arr[4], w2 / denominator)
      } else if (
        arr[1] != null &&
        arr[2] == null &&
        arr[3] != null &&
        arr[4] == null
      ) {
        const r2 = Math.pow(arr[1], w1) * Math.pow(arr[3], 1 - w1)
        arr[2] = r2
        arr[4] = Math.pow(r2, 1 - 1 / w2) * Math.pow(arr[3], 1 / w2)
      } else if (
        arr[1] != null &&
        arr[2] != null &&
        arr[3] == null &&
        arr[4] == null
      ) {
        const r3 =
          Math.pow(arr[1], 1 - 1 / (1 - w1)) * Math.pow(arr[2], 1 / (1 - w1))
        arr[3] = r3
        arr[4] = Math.pow(arr[2], 1 - 1 / w2) * Math.pow(r3, 1 / w2)
      }
      initS0 = arr.filter((value): value is number => value != null)
      break
    }
    case 3: {
      if (arr[1] == null && arr[2] != null && arr[3] != null) {
        arr[1] = Math.pow(arr[2], 1 / w1) * Math.pow(arr[3], 1 - 1 / w1)
      } else if (arr[1] != null && arr[2] == null && arr[3] != null) {
        arr[2] = Math.pow(arr[1], w1) * Math.pow(arr[3], 1 - w1)
      } else if (arr[2] != null && arr[3] == null && arr[4] != null) {
        arr[3] = Math.pow(arr[2], 1 - w2) * Math.pow(arr[4], w2)
      } else if (arr[2] != null && arr[3] != null && arr[4] == null) {
        arr[4] = Math.pow(arr[2], 1 - 1 / w2) * Math.pow(arr[3], 1 / w2)
      }
      initS0 = arr.filter((value): value is number => value != null)
      break
    }
    case 4:
      initS0 = arr.filter((value): value is number => value != null)
      break
    default:
      break
  }

  const clamped = initS0.map((value) =>
    Math.min(Math.max(value, S_MIN), INIT_S_MAX)
  )
  return [clamped[0], clamped[1], clamped[2], clamped[3]]
}
