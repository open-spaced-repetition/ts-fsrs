import { createEmptyCard, DefaultScheduler, FSRS, Rating } from 'ts-fsrs'
import { describe, test } from 'vitest'

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
let _schedulerSink: FSRS | DefaultScheduler<'FSRS-6'> | undefined

function consume(value: number): void {
  sink = (sink + value) % Number.MAX_SAFE_INTEGER
}

function consumePreview(
  result: ReturnType<DefaultScheduler<'FSRS-6'>['preview']>
): void {
  for (const item of result) consume(item.card.dueAt.getTime())
}

for (const enableFuzz of [false, true]) {
  for (const scenario of scenarios) {
    const parameters = {
      enable_short_term: scenario.enableShortTerm,
      enable_fuzz: enableFuzz,
    }
    const options = {
      version: 'FSRS-6' as const,
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

      test('legacy FSRS constructor', async ({ bench }) => {
        await bench('legacy FSRS constructor', () => {
          _schedulerSink = new FSRS(parameters)
        }).run()
      })

      test('DefaultScheduler cached factory', async ({ bench }) => {
        await bench('DefaultScheduler cached factory', async () => {
          _schedulerSink = await DefaultScheduler(options)
        }).run()
      })

      test('legacy FSRS review new card', async ({ bench }) => {
        await bench('legacy FSRS review new card', () => {
          consume(
            legacy
              .next(legacyNewCard, initialReviewAt, grade)
              .card.due.getTime()
          )
        }).run()
      })

      test('DefaultScheduler review new card', async ({ bench }) => {
        await bench('DefaultScheduler review new card', () => {
          consume(
            scheduler
              .review({ card: newCard, grade, now: initialReviewAt })
              .card.dueAt.getTime()
          )
        }).run()
      })

      test(`legacy FSRS review ${scenario.existingCardName}`, async ({
        bench,
      }) => {
        await bench(`legacy FSRS review ${scenario.existingCardName}`, () => {
          consume(
            legacy
              .next(legacyExistingCard, scenario.existingReviewAt, grade)
              .card.due.getTime()
          )
        }).run()
      })

      test(`DefaultScheduler review ${scenario.existingCardName}`, async ({
        bench,
      }) => {
        await bench(
          `DefaultScheduler review ${scenario.existingCardName}`,
          () => {
            consume(
              scheduler
                .review({
                  card: existingCard,
                  grade,
                  now: scenario.existingReviewAt,
                })
                .card.dueAt.getTime()
            )
          }
        ).run()
      })

      test('legacy FSRS repeat new card', async ({ bench }) => {
        await bench('legacy FSRS repeat new card', () => {
          consume(
            legacy
              .repeat(legacyNewCard, initialReviewAt)
              [Rating.Easy].card.due.getTime()
          )
        }).run()
      })

      test('DefaultScheduler full preview new card', async ({ bench }) => {
        await bench('DefaultScheduler full preview new card', () => {
          consumePreview(
            scheduler.preview({ card: newCard, now: initialReviewAt })
          )
        }).run()
      })

      test(`legacy FSRS repeat ${scenario.existingCardName}`, async ({
        bench,
      }) => {
        await bench(`legacy FSRS repeat ${scenario.existingCardName}`, () => {
          consume(
            legacy
              .repeat(legacyExistingCard, scenario.existingReviewAt)
              [Rating.Easy].card.due.getTime()
          )
        }).run()
      })

      test(`DefaultScheduler full preview ${scenario.existingCardName}`, async ({
        bench,
      }) => {
        await bench(
          `DefaultScheduler full preview ${scenario.existingCardName}`,
          () => {
            consumePreview(
              scheduler.preview({
                card: existingCard,
                now: scenario.existingReviewAt,
              })
            )
          }
        ).run()
      })

      test('legacy FSRS forget new card', async ({ bench }) => {
        await bench('legacy FSRS forget new card', () => {
          consume(
            legacy
              .forget(legacyNewCard, scenario.existingReviewAt)
              .card.due.getTime()
          )
        }).run()
      })

      test('DefaultScheduler forget new card', async ({ bench }) => {
        await bench('DefaultScheduler forget new card', () => {
          consume(
            scheduler
              .forget({ card: newCard, now: scenario.existingReviewAt })
              .dueAt.getTime()
          )
        }).run()
      })

      test(`legacy FSRS forget ${scenario.existingCardName}`, async ({
        bench,
      }) => {
        await bench(`legacy FSRS forget ${scenario.existingCardName}`, () => {
          consume(
            legacy
              .forget(legacyExistingCard, scenario.existingReviewAt)
              .card.due.getTime()
          )
        }).run()
      })

      test(`DefaultScheduler forget ${scenario.existingCardName}`, async ({
        bench,
      }) => {
        await bench(
          `DefaultScheduler forget ${scenario.existingCardName}`,
          () => {
            consume(
              scheduler
                .forget({
                  card: existingCard,
                  now: scenario.existingReviewAt,
                })
                .dueAt.getTime()
            )
          }
        ).run()
      })
    })
  }
}
