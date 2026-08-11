import {
  type Card,
  type DefaultScheduler,
  type DefaultSchedulerCard,
  type DefaultSchedulerOptions,
  FSRS,
  type FSRSParameters,
  type Grade,
  generatorParameters,
  type ReviewLog,
  State,
} from 'ts-fsrs'
import { scheduleStatusByState } from './default-scheduler.test-utils.js'

type ReviewResult = ReturnType<DefaultScheduler['review']>
const legacyDefaults = generatorParameters()

function toLegacyParameters(options: DefaultSchedulerOptions): FSRSParameters {
  return generatorParameters({
    w: Array.from(options.weights ?? legacyDefaults.w),
    enable_short_term:
      options.enableShortTerm ?? legacyDefaults.enable_short_term,
    request_retention:
      options.desiredRetention ?? legacyDefaults.request_retention,
    learning_steps: Array.from(
      options.learningSteps ?? legacyDefaults.learning_steps
    ),
    relearning_steps: Array.from(
      options.relearningSteps ?? legacyDefaults.relearning_steps
    ),
    enable_fuzz: options.enableFuzz ?? legacyDefaults.enable_fuzz,
    maximum_interval:
      options.maximumInterval ?? legacyDefaults.maximum_interval,
  })
}

function toLegacyCard(card: DefaultSchedulerCard): Card {
  return {
    due: card.dueAt,
    stability: card.stability,
    difficulty: card.difficulty,
    scheduled_days: card.scheduledDays,
    learning_steps: card.learningStep,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.lastReviewAt ?? undefined,
  }
}

function fromLegacyCard(
  card: Card,
  cardId: DefaultSchedulerCard['cardId']
): DefaultSchedulerCard {
  return {
    cardId,
    dueAt: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    scheduledDays: card.scheduled_days,
    learningStep: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    scheduleStatus: scheduleStatusByState[card.state],
    lastReviewAt: card.last_review ?? null,
  }
}

function fromLegacyRevlog(
  revlog: ReviewLog,
  cardId: DefaultSchedulerCard['cardId']
): ReviewResult['revlog'] {
  return {
    cardId,
    dueAt: revlog.due,
    stability: revlog.stability,
    difficulty: revlog.difficulty,
    scheduledDays: revlog.scheduled_days,
    learningStep: revlog.learning_steps,
    rating: revlog.rating as Grade,
    state: revlog.state,
    scheduleStatus: scheduleStatusByState[revlog.state],
    reviewTime: revlog.review,
  }
}

function toLegacyRevlog(revlog: ReviewResult['revlog']): ReviewLog {
  return {
    rating: revlog.rating,
    state: revlog.state,
    due: revlog.dueAt,
    stability: revlog.stability,
    difficulty: revlog.difficulty,
    scheduled_days: revlog.scheduledDays,
    learning_steps: revlog.learningStep,
    review: revlog.reviewTime,
  }
}

export function legacyReview(
  options: DefaultSchedulerOptions,
  card: DefaultSchedulerCard,
  now: Date,
  grade: Grade
): ReviewResult {
  const result = legacyNext(options, card, now, grade)
  return {
    card: fromLegacyCard(result.card, card.cardId),
    revlog: fromLegacyRevlog(result.log, card.cardId),
  }
}

export function legacyNext(
  options: DefaultSchedulerOptions,
  card: DefaultSchedulerCard,
  now: Date,
  grade: Grade
) {
  return new FSRS(toLegacyParameters(options)).next(
    toLegacyCard(card),
    now,
    grade
  )
}

export function legacyRollback(
  options: DefaultSchedulerOptions,
  result: ReviewResult
): Card {
  return new FSRS(toLegacyParameters(options)).rollback(
    toLegacyCard(result.card),
    toLegacyRevlog(result.revlog)
  )
}

export function expectRollbackParity(
  actual: DefaultSchedulerCard,
  expected: Card | DefaultSchedulerCard,
  revlog?: ReviewResult['revlog']
): void {
  const expectedCard =
    'cardId' in expected ? expected : fromLegacyCard(expected, actual.cardId)
  expect(actual).toEqual({
    ...expectedCard,
    dueAt: revlog?.state === State.New ? revlog.reviewTime : expectedCard.dueAt,
    lastReviewAt:
      revlog?.state === State.New ? revlog.dueAt : expectedCard.lastReviewAt,
  })
}

export function expectRevlogParity(
  actual: ReviewResult['revlog'],
  expected: ReviewResult['revlog']
): void {
  expect(actual).toEqual({
    ...expected,
    dueAt: expected.state === State.New ? actual.dueAt : expected.dueAt,
  })
}

export function expectFullParity(
  actual: ReviewResult,
  expected: ReviewResult
): void {
  expect(actual.card).toEqual(expected.card)
  expectRevlogParity(actual.revlog, expected.revlog)
}

export function expectSequenceParity(
  actual: ReviewResult,
  expected: ReviewResult,
  previousCard: DefaultSchedulerCard,
  enableShortTerm: boolean
): void {
  if (
    enableShortTerm &&
    (previousCard.state === State.Learning ||
      previousCard.state === State.Relearning)
  ) {
    expect(actual.card).toEqual({
      ...expected.card,
      dueAt: actual.card.dueAt,
      scheduledDays: actual.card.scheduledDays,
    })
    expect(actual.card.scheduledDays).toBeGreaterThanOrEqual(
      expected.card.scheduledDays
    )
    expectRevlogParity(actual.revlog, expected.revlog)
    return
  }

  expectFullParity(actual, expected)
}
