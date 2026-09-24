import * as fs from 'node:fs'
import { computeOptimalSteps } from '@open-spaced-repetition/binding'

describe('computeOptimalSteps', () => {
  const csvBuffer = fs.readFileSync(new URL('./revlog.csv', import.meta.url))

  const buildCsvBuffer = (rows: string[]) =>
    Buffer.from(
      [
        'card_id,review_time,review_rating,review_state,review_duration',
        ...rows,
      ].join('\n')
    )

  const buildAgainLearningCsv = (cardCount: number, secondRating: number) =>
    buildCsvBuffer(
      Array.from({ length: cardCount }, (_, index) => [
        `${index},0,1,0,0`,
        `${index},60000,${secondRating},1,0`,
      ]).flat()
    )

  describe('successful computation', () => {
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

    test('should compute step stats with FSRS-6 decay', () => {
      const result = computeOptimalSteps(csvBuffer, 0.9, 0.1542)

      expect(result).toBeDefined()
      expect(result.recommendedLearningSteps).toEqual([80, 5806])
      expect(result.recommendedRelearningSteps).toEqual([1049])
      console.debug(
        'Step stats with FSRS-6 decay:',
        JSON.stringify(result, null, 2)
      )
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

      console.debug(
        'Learning steps (seconds):',
        result.recommendedLearningSteps
      )
      console.debug(
        'Relearning steps (seconds):',
        result.recommendedRelearningSteps
      )
    })

    test('different desired_retention should affect step values', () => {
      const result09 = computeOptimalSteps(csvBuffer, 0.9, 0.5)
      const result08 = computeOptimalSteps(csvBuffer, 0.8, 0.5)

      // Lower retention -> longer acceptable intervals -> larger steps
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
        console.debug(
          '0.9 retention relearning steps:',
          result09.recommendedRelearningSteps
        )
        console.debug(
          '0.8 retention relearning steps:',
          result08.recommendedRelearningSteps
        )
        expect(result08.recommendedRelearningSteps[0]).toBeGreaterThan(
          result09.recommendedRelearningSteps[0]
        )
      }
    })
  })

  describe('input validation', () => {
    test.each([13, 17, 19, 21, 34])(
      'rejects a model parameter array of length %s',
      (length) => {
        expect(() => {
          // @ts-expect-error Model parameters are no longer accepted.
          computeOptimalSteps(csvBuffer, 0.9, Array(length).fill(0.5))
        }).toThrow()
      }
    )

    test('should reject invalid desired_retention', () => {
      expect(() => computeOptimalSteps(csvBuffer, 0.0, 0.5)).toThrow(
        'desired_retention'
      )
      expect(() => computeOptimalSteps(csvBuffer, 1.0, 0.5)).toThrow(
        'desired_retention'
      )
      expect(() => computeOptimalSteps(csvBuffer, -0.1, 0.5)).toThrow(
        'desired_retention'
      )
    })

    test('should reject invalid decay value', () => {
      expect(() => computeOptimalSteps(csvBuffer, 0.9, 0)).toThrow(
        'between 0.1 and 1'
      )
      expect(() => computeOptimalSteps(csvBuffer, 0.9, -0.5)).toThrow(
        'between 0.1 and 1'
      )
      expect(() => computeOptimalSteps(csvBuffer, 0.9, 1.01)).toThrow(
        'between 0.1 and 1'
      )
      expect(() => computeOptimalSteps(csvBuffer, 0.9, Number.NaN)).toThrow(
        'between 0.1 and 1'
      )
    })

    test('should reject malformed csv rows', () => {
      const malformedCsv = buildCsvBuffer(['1,not-a-time,1,0,0'])

      expect(() => computeOptimalSteps(malformedCsv, 0.9, 0.5)).toThrow(
        'CSV deserialization error'
      )
    })
  })

  test.each([0.5, 1])('inverts the fitted curve with decay %s', (decay) => {
    const result = computeOptimalSteps(csvBuffer, 0.8, decay)
    const stability = result.again!.stability
    const factor = 0.9 ** (-1 / decay) - 1
    const expected = (stability * (0.8 ** (-1 / decay) - 1)) / factor
    expect(result.recommendedLearningSteps[0]).toBe(Math.round(expected))
  })

  describe('boundary behavior', () => {
    test.each([0.1, 0.5, 0.8, 1])(
      'should accept boundary decay value %s',
      (decay) => {
        expect(() => computeOptimalSteps(csvBuffer, 0.9, decay)).not.toThrow()
      }
    )

    test.each([
      { secondRating: 1, expectedRetention: 0 },
      { secondRating: 3, expectedRetention: 1 },
    ])(
      'should keep no recommendation for unanimous retention $expectedRetention',
      ({ secondRating, expectedRetention }) => {
        const result = computeOptimalSteps(
          buildAgainLearningCsv(100, secondRating),
          0.9,
          0.5
        )

        expect(result.again).toMatchObject({
          count: 100,
          retention: expectedRetention,
        })
        expect(result.recommendedLearningSteps).toEqual([])
        expect(result.recommendedRelearningSteps).toEqual([])
      }
    )

    test('should return stats but not recommend steps below threshold', () => {
      const result = computeOptimalSteps(buildAgainLearningCsv(4, 3), 0.9, 0.5)

      expect(result.again).toMatchObject({
        count: 4,
        retention: 1,
      })
      expect(result.recommendedLearningSteps).toEqual([])
      expect(result.recommendedRelearningSteps).toEqual([])
    })
  })
})
