import * as fs from 'node:fs'
import { computeOptimalSteps } from '@open-spaced-repetition/binding'

describe('computeOptimalSteps', () => {
  const csvBuffer = fs.readFileSync(new URL('./revlog.csv', import.meta.url))

  test('should compute step stats with decay value', () => {
    const result = computeOptimalSteps(csvBuffer, 0.9, 0.5)

    expect(result).toBeDefined()
    expect(result).toMatchObject({
      again: expect.objectContaining({ count: expect.any(Number) }),
      hard: expect.objectContaining({ count: expect.any(Number) }),
      good: expect.objectContaining({ count: expect.any(Number) }),
      againThenGood: expect.objectContaining({ count: expect.any(Number) }),
      goodThenAgain: expect.objectContaining({ count: expect.any(Number) }),
      relearning: expect.objectContaining({ count: expect.any(Number) }),
      recommendedLearningSteps: [90, 5485],
      recommendedRelearningSteps: [1122],
    })

    console.debug('Step stats result:', JSON.stringify(result, null, 2))
  })

  test('should compute step stats with parameters array', () => {
    // 21-element parameter array with w[20] = 0.1542 (FSRS6 default decay)
    const params = [
      0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722,
      0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425,
      0.0912, 0.0658, 0.1542,
    ]
    const result = computeOptimalSteps(csvBuffer, 0.9, params)

    expect(result).toBeDefined()
    expect(result.recommendedLearningSteps).toEqual([80, 5806])
    expect(result.recommendedRelearningSteps).toEqual([1049])
    console.debug('Step stats with params:', JSON.stringify(result, null, 2))
  })

  test('recommended steps should be reasonable', () => {
    const result = computeOptimalSteps(csvBuffer, 0.9, 0.5)

    for (const step of result.recommendedLearningSteps) {
      expect(step).toBeGreaterThanOrEqual(1) // at least 1 second
      expect(step).toBeLessThan(43200) // less than 12 hours
    }
    for (const step of result.recommendedRelearningSteps) {
      expect(step).toBeGreaterThanOrEqual(1)
      expect(step).toBeLessThan(43200)
    }

    console.debug('Learning steps (seconds):', result.recommendedLearningSteps)
    console.debug(
      'Relearning steps (seconds):',
      result.recommendedRelearningSteps
    )
  })

  test('should reject invalid parameters array', () => {
    expect(() => {
      computeOptimalSteps(csvBuffer, 0.9, [1.0, 2.0]) // too short
    }).toThrow('at least 21 elements')
  })

  test('should reject invalid desired_retention', () => {
    expect(() => computeOptimalSteps(csvBuffer, 0.0, 0.5)).toThrow('desired_retention')
    expect(() => computeOptimalSteps(csvBuffer, 1.0, 0.5)).toThrow('desired_retention')
    expect(() => computeOptimalSteps(csvBuffer, -0.1, 0.5)).toThrow('desired_retention')
  })

  test('different desired_retention should affect step values', () => {
    const result09 = computeOptimalSteps(csvBuffer, 0.9, 0.5)
    const result08 = computeOptimalSteps(csvBuffer, 0.8, 0.5)

    // Lower retention → longer acceptable intervals → larger steps
    if (
      result09.recommendedLearningSteps.length > 0 &&
      result08.recommendedLearningSteps.length > 0
    ) {
      console.debug('0.9 retention steps:', result09.recommendedLearningSteps)
      console.debug('0.8 retention steps:', result08.recommendedLearningSteps)
      expect(result08.recommendedLearningSteps[0]).toBeGreaterThan(
        result09.recommendedLearningSteps[0]
      )
    }

    if (
      result09.recommendedRelearningSteps.length > 0 &&
      result08.recommendedRelearningSteps.length > 0
    ) {
      console.debug('0.9 retention relearning steps:', result09.recommendedRelearningSteps)
      console.debug('0.8 retention relearning steps:', result08.recommendedRelearningSteps)
      expect(result08.recommendedRelearningSteps[0]).toBeGreaterThan(
        result09.recommendedRelearningSteps[0]
      )
    }
  })
})
