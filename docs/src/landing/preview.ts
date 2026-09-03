import type { Grade } from 'ts-fsrs'
import * as compose from '../snippets/landing/compose'
import * as defaultSnippet from '../snippets/landing/default'
import * as extend from '../snippets/landing/extend'
import type {
  LandingPreview,
  LandingPreviewRow,
  LandingPreviews,
} from './preview-data'

type ScheduledCard = {
  readonly dueAt: Date
  readonly stability: number
  readonly difficulty: number
  readonly scheduleStatus: string
}

type LandingSnippetModule = {
  readonly now: Date
  readonly outcomes: Iterable<{
    readonly grade: Grade
    readonly card: ScheduledCard
  }>
}

const SNIPPET_MODULES = {
  compose,
  default: defaultSnippet,
  extend,
} satisfies Record<string, LandingSnippetModule>

export type LandingSnippetId = keyof typeof SNIPPET_MODULES

// These fields are rendered separately from middleware extras.
const BASE_CARD_FIELDS = new Set([
  'cardId',
  'dueAt',
  'lastReviewAt',
  'stability',
  'difficulty',
  'scheduledDays',
  'scheduleStatus',
  'state',
  'learningStep',
  'reps',
  'lapses',
])

function readExtras(
  card: ScheduledCard
): Record<string, string | number | boolean> {
  const extras: Record<string, string | number | boolean> = {}
  for (const [field, value] of Object.entries(card)) {
    if (BASE_CARD_FIELDS.has(field)) continue
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      extras[field] = value
    }
  }
  return extras
}

// Run at build time so `ts-fsrs` stays out of the home page bundle.
export function collectLandingPreviews(): LandingPreviews {
  const previews: Record<string, LandingPreview> = {}

  for (const [id, { now, outcomes }] of Object.entries(SNIPPET_MODULES)) {
    const grades = {} as Record<Grade, LandingPreviewRow>
    for (const { grade, card } of outcomes) {
      grades[grade] = {
        dueAt: card.dueAt.toISOString(),
        stability: card.stability,
        difficulty: card.difficulty,
        scheduleStatus: card.scheduleStatus,
        extras: readExtras(card),
      }
    }
    previews[id] = { now: now.toISOString(), grades }
  }

  return previews
}
