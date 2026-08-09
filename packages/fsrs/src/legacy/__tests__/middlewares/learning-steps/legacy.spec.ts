import { Rating, State } from '@open-spaced-repetition/srs-kit'
import { describe, expect, it } from 'vitest'
import { default_w } from '@/constant.js'
import { createEmptyCard, generatorParameters } from '@/default.js'
import { dateDiffInDays } from '@/help.js'
import { fsrs } from '@/legacy/fsrs.js'
import { StrategyMode } from '@/legacy/strategies/types.js'
import type { LearningStepsResolver } from '@/middlewares/learning-steps/types.js'

describe('legacy FSRS learning-steps integration', () => {
  it('schedules the first learning step for every grade', () => {
    const scheduler = fsrs({
      learning_steps: ['1m', '10m'],
      relearning_steps: ['10m'],
    })
    const now = new Date(2022, 11, 29, 12, 30)
    const record = scheduler.repeat(createEmptyCard(now), now)

    expect(record[Rating.Again].card.learning_steps).toBe(0)
    expect(record[Rating.Again].card.due.getTime() - now.getTime()).toBe(60_000)
    expect(record[Rating.Hard].card.learning_steps).toBe(0)
    expect(record[Rating.Hard].card.due.getTime() - now.getTime()).toBe(
      6 * 60_000
    )
    expect(record[Rating.Good].card.learning_steps).toBe(1)
    expect(record[Rating.Good].card.due.getTime() - now.getTime()).toBe(
      10 * 60_000
    )
    expect(record[Rating.Easy].card.learning_steps).toBe(0)
    expect(dateDiffInDays(now, record[Rating.Easy].card.due)).toBe(
      Math.floor(default_w[3])
    )
  })

  it('keeps the legacy custom learning-step extension available', () => {
    let calls = 0
    const learningSteps: LearningStepsResolver = (
      _config,
      _state,
      learningStep
    ) => {
      calls += 1
      return learningStep >= 1
        ? {
            [Rating.Again]: { scheduledMinutes: 5, nextStep: 1 },
            [Rating.Hard]: { scheduledMinutes: 10, nextStep: 1 },
          }
        : {
            [Rating.Again]: { scheduledMinutes: 1, nextStep: 1 },
            [Rating.Hard]: { scheduledMinutes: 5, nextStep: 1 },
            [Rating.Good]: { scheduledMinutes: 10, nextStep: 1 },
          }
    }
    const scheduler = fsrs().useStrategy(
      StrategyMode.LEARNING_STEPS,
      learningSteps
    )
    const now = new Date(2022, 11, 29, 12, 30)
    const first = scheduler.repeat(createEmptyCard(now), now)

    expect(first[Rating.Good].card.learning_steps).toBe(1)
    expect(first[Rating.Good].card.due.getTime() - now.getTime()).toBe(
      10 * 60_000
    )
    expect(calls).toBe(1)

    const nextNow = first[Rating.Good].card.due
    const second = scheduler.repeat(first[Rating.Good].card, nextNow)
    expect(second[Rating.Again].card.learning_steps).toBe(1)
    expect(second[Rating.Again].card.due.getTime() - nextNow.getTime()).toBe(
      5 * 60_000
    )
    expect(second[Rating.Good].card.state).toBe(State.Review)
    expect(calls).toBe(2)

    // biome-ignore lint/complexity/useLiteralKeys: verify legacy registration
    expect(scheduler['strategyHandler'].get(StrategyMode.LEARNING_STEPS)).toBe(
      learningSteps
    )
    scheduler.clearStrategy()
    expect(
      // biome-ignore lint/complexity/useLiteralKeys: verify legacy cleanup
      scheduler['strategyHandler'].get(StrategyMode.LEARNING_STEPS)
    ).toBeUndefined()
  })

  it('keeps minute precision while exposing whole scheduled days', () => {
    const learningSteps: LearningStepsResolver = () => ({
      [Rating.Again]: { scheduledMinutes: 5, nextStep: 1 },
      [Rating.Hard]: { scheduledMinutes: 1440, nextStep: 1 },
      [Rating.Good]: { scheduledMinutes: 4320, nextStep: 1 },
    })
    const scheduler = fsrs().useStrategy(
      StrategyMode.LEARNING_STEPS,
      learningSteps
    )
    const now = new Date(2022, 11, 29, 12, 30)
    const record = scheduler.repeat(createEmptyCard(now), now)

    expect(record[Rating.Again].card.scheduled_days).toBe(0)
    expect(record[Rating.Hard].card.scheduled_days).toBe(1)
    expect(record[Rating.Hard].card.due.getTime() - now.getTime()).toBe(
      1440 * 60_000
    )
    expect(record[Rating.Good].card.scheduled_days).toBe(3)
    expect(record[Rating.Good].card.due.getTime() - now.getTime()).toBe(
      4320 * 60_000
    )
  })

  it('rounds decimal minutes exactly as the legacy scheduler did', () => {
    const scheduler = fsrs({ learning_steps: ['1.5m'] })
    const now = new Date(2022, 11, 29, 12, 30)
    const result = scheduler.next(createEmptyCard(now), now, Rating.Again)

    expect(result.card.due.getTime() - now.getTime()).toBe(2 * 60_000)
    expect(result.card.scheduled_days).toBe(0)
  })

  it('still accepts generated parameters in the legacy facade', () => {
    const params = generatorParameters({ learning_steps: ['2m'] })
    const scheduler = fsrs(params)
    const now = new Date(2022, 11, 29, 12, 30)

    expect(
      scheduler
        .next(createEmptyCard(now), now, Rating.Again)
        .card.due.getTime() - now.getTime()
    ).toBe(2 * 60_000)
  })
})
