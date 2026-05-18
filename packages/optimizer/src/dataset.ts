import type { FSRSItem, PreparedTrainingItem, WeightedFSRSItem } from './types'

type DeltaGroup = {
  deltaT: number
  items: FSRSItem[]
}

export function calculateAverageRecall(items: readonly FSRSItem[]): number {
  let totalRecall = 0
  let totalReviews = 0

  for (const item of items) {
    const current = item.current
    if (!current) {
      continue
    }
    totalRecall += current.rating > 1 ? 1 : 0
    totalReviews += 1
  }

  if (totalReviews === 0) {
    return 0
  }
  return totalRecall / totalReviews
}

export function filterOutlier(
  datasetForInitialization: readonly FSRSItem[],
  trainSet: readonly FSRSItem[]
): [FSRSItem[], FSRSItem[]] {
  const groups = new Map<number, Map<number, FSRSItem[]>>()

  for (const item of datasetForInitialization) {
    const firstReview = item.reviews[0]
    const secondReview = item.current
    if (!firstReview || !secondReview) {
      continue
    }
    const ratingGroup =
      groups.get(firstReview.rating) ?? new Map<number, FSRSItem[]>()
    groups.set(firstReview.rating, ratingGroup)
    const deltaGroup = ratingGroup.get(secondReview.deltaT) ?? []
    deltaGroup.push(item)
    ratingGroup.set(secondReview.deltaT, deltaGroup)
  }

  const filteredItems: FSRSItem[] = []
  const removedPairs = Array.from({ length: 5 }, () => new Set<number>())

  for (let rating = 1; rating < removedPairs.length; rating++) {
    const deltaGroups = groups.get(rating)
    if (!deltaGroups) {
      continue
    }

    const subGroups: DeltaGroup[] = []
    let total = 0
    for (const [deltaT, items] of deltaGroups) {
      subGroups.push({ deltaT, items })
      total += items.length
    }

    subGroups.sort((left, right) => {
      const sizeDiff = right.items.length - left.items.length
      if (sizeDiff !== 0) {
        return sizeDiff
      }
      return right.deltaT - left.deltaT
    })

    const threshold = Math.max(20, Math.floor(total / 20))
    let removedCount = 0

    for (let index = subGroups.length - 1; index >= 0; index--) {
      const { deltaT, items } = subGroups[index]
      if (removedCount + items.length >= threshold) {
        const keep = items.length >= 6 && deltaT <= (rating !== 4 ? 100 : 365)
        if (keep) {
          for (const item of items) {
            filteredItems.push(item)
          }
        } else {
          removedPairs[rating].add(deltaT)
        }
      } else {
        removedCount += items.length
        removedPairs[rating].add(deltaT)
      }
    }
  }

  const filteredTrainSet = trainSet.filter((item) => {
    const firstRating = item.reviews[0]?.rating
    if (firstRating == null) {
      return false
    }
    return !removedPairs[firstRating].has(item.firstLongTermReview().deltaT)
  })

  return [filteredItems, filteredTrainSet]
}

export function prepareTrainingData(
  items: readonly FSRSItem[]
): [FSRSItem[], FSRSItem[]] {
  const datasetForInitialization: FSRSItem[] = []
  const trainSet: FSRSItem[] = []

  for (const item of items) {
    if (item.longTermReviewCnt() === 1) {
      datasetForInitialization.push(item)
    } else {
      trainSet.push(item)
    }
  }

  if (process.env.FSRS_NO_OUTLIER !== undefined) {
    return [datasetForInitialization, trainSet]
  }

  return filterOutlier(datasetForInitialization, items)
}

export function recencyWeightedFsrsItems(
  items: readonly FSRSItem[]
): WeightedFSRSItem[] {
  const length = Math.max(items.length - 1, 1)
  return items.map((item, index) => ({
    weight: 0.25 + 0.75 * Math.pow(index / length, 3),
    item,
  }))
}

export function sortItemsByReviewLength(
  items: readonly WeightedFSRSItem[]
): WeightedFSRSItem[] {
  return [...items].sort(
    (left, right) => left.item.reviews.length - right.item.reviews.length
  )
}

export function prepareBatchItems(
  items: readonly WeightedFSRSItem[]
): PreparedTrainingItem[] {
  return items.map(({ item, weight }) => {
    const history = item.reviews.slice(0, -1)
    const current = item.current
    if (!current) {
      throw new Error('FSRS item must contain at least one review')
    }
    return {
      item,
      weight,
      historyRatings: history.map((review) => review.rating),
      historyDeltaTs: history.map((review) => review.deltaT),
      currentDeltaT: current.deltaT,
      label: current.rating === 1 ? 0 : 1,
    }
  })
}

export function createBatches<T>(
  items: readonly T[],
  batchSize: number
): T[][] {
  const batches: T[][] = []
  for (let index = 0; index < items.length; index += batchSize) {
    batches.push(items.slice(index, index + batchSize))
  }
  return batches
}
