import { createEmptyCard, DefaultScheduler, FSRS, Rating } from 'ts-fsrs'
import { bench, describe } from 'vitest'

const initialReviewAt = new Date('2026-01-01T00:00:00.000Z')
const reviewAt = new Date('2026-01-10T00:00:00.000Z')
const learningReviewAt = new Date('2026-01-01T00:10:00.000Z')
const grade = Rating.Good
const scenarios = [
  {
    name: 'long-term',
    enableShortTerm: false,
    existingCardName: 'existing review card',
    existingReviewAt: reviewAt,
  },
  {
    name: 'short-term',
    enableShortTerm: true,
    existingCardName: 'learning card',
    existingReviewAt: learningReviewAt,
  },
] as const

let sink = 0
let _schedulerSink: FSRS | DefaultScheduler | undefined

function consume(value: number): void {
  sink = (sink + value) % Number.MAX_SAFE_INTEGER
}

function consumePreview(result: ReturnType<DefaultScheduler['preview']>): void {
  for (const item of result) consume(item.card.dueAt.getTime())
}

for (const enableFuzz of [false, true]) {
  for (const scenario of scenarios) {
    const parameters = {
      enable_short_term: scenario.enableShortTerm,
      enable_fuzz: enableFuzz,
    }
    const options = {
      enableShortTerm: scenario.enableShortTerm,
      enableFuzz,
    }
    const scheduler = await DefaultScheduler(options)

    describe(`${scenario.name} scheduler (fuzz ${enableFuzz ? 'on' : 'off'})`, () => {
      const legacy = new FSRS(parameters)
      const cardId = `bench-${scenario.name}-${enableFuzz}`
      const legacyNewCard = createEmptyCard(initialReviewAt)
      const newCard = scheduler.newCard({ now: initialReviewAt, cardId })
      const legacyExistingCard = legacy.next(
        legacyNewCard,
        initialReviewAt,
        grade
      ).card
      const existingCard = scheduler.review({
        card: newCard,
        grade,
        now: initialReviewAt,
      }).card

      bench('legacy FSRS constructor', () => {
        _schedulerSink = new FSRS(parameters)
      })

      bench('DefaultScheduler cached factory', async () => {
        _schedulerSink = await DefaultScheduler(options)
      })

      bench('legacy FSRS review new card', () => {
        consume(
          legacy.next(legacyNewCard, initialReviewAt, grade).card.due.getTime()
        )
      })

      bench('DefaultScheduler review new card', () => {
        consume(
          scheduler
            .review({ card: newCard, grade, now: initialReviewAt })
            .card.dueAt.getTime()
        )
      })

      bench(`legacy FSRS review ${scenario.existingCardName}`, () => {
        consume(
          legacy
            .next(legacyExistingCard, scenario.existingReviewAt, grade)
            .card.due.getTime()
        )
      })

      bench(`DefaultScheduler review ${scenario.existingCardName}`, () => {
        consume(
          scheduler
            .review({
              card: existingCard,
              grade,
              now: scenario.existingReviewAt,
            })
            .card.dueAt.getTime()
        )
      })

      bench('legacy FSRS repeat new card', () => {
        consume(
          legacy
            .repeat(legacyNewCard, initialReviewAt)
            [Rating.Easy].card.due.getTime()
        )
      })

      bench('DefaultScheduler full preview new card', () => {
        consumePreview(
          scheduler.preview({ card: newCard, now: initialReviewAt })
        )
      })

      bench(`legacy FSRS repeat ${scenario.existingCardName}`, () => {
        consume(
          legacy
            .repeat(legacyExistingCard, scenario.existingReviewAt)
            [Rating.Easy].card.due.getTime()
        )
      })

      bench(
        `DefaultScheduler full preview ${scenario.existingCardName}`,
        () => {
          consumePreview(
            scheduler.preview({
              card: existingCard,
              now: scenario.existingReviewAt,
            })
          )
        }
      )

      bench('legacy FSRS forget new card', () => {
        consume(
          legacy
            .forget(legacyNewCard, scenario.existingReviewAt)
            .card.due.getTime()
        )
      })

      bench('DefaultScheduler forget new card', () => {
        consume(
          scheduler
            .forget({ card: newCard, now: scenario.existingReviewAt })
            .dueAt.getTime()
        )
      })

      bench(`legacy FSRS forget ${scenario.existingCardName}`, () => {
        consume(
          legacy
            .forget(legacyExistingCard, scenario.existingReviewAt)
            .card.due.getTime()
        )
      })

      bench(`DefaultScheduler forget ${scenario.existingCardName}`, () => {
        consume(
          scheduler
            .forget({
              card: existingCard,
              now: scenario.existingReviewAt,
            })
            .dueAt.getTime()
        )
      })
    })
  }
}
