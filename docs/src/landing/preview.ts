import { pathToFileURL } from 'node:url'
import type { Grade } from 'ts-fsrs'
import type {
  LandingPreview,
  LandingPreviewRow,
  LandingPreviews,
} from './preview-data'

// Snippets pin `now` so build output stays deterministic.
type ScheduledCard = {
  dueAt: Date
  stability: number
  difficulty: number
  scheduleStatus: string
} & Record<string, unknown>

type LandingSnippetModule = {
  readonly scheduler: {
    preview(input: { card: unknown; now: Date }): Iterable<{
      grade: Grade
      card: ScheduledCard
    }>
  }
  readonly card: unknown
  readonly now: Date
}

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
export async function collectLandingPreviews(
  snippetFiles: ReadonlyMap<string, string>
): Promise<LandingPreviews> {
  const previews: Record<string, LandingPreview> = {}

  for (const [id, file] of snippetFiles) {
    const { scheduler, card, now }: LandingSnippetModule = await import(
      pathToFileURL(file).href
    )
    const preview = {} as Record<Grade, LandingPreviewRow>
    for (const { grade, card: scheduled } of scheduler.preview({ card, now })) {
      preview[grade] = {
        dueAt: scheduled.dueAt.toISOString(),
        stability: scheduled.stability,
        difficulty: scheduled.difficulty,
        scheduleStatus: scheduled.scheduleStatus,
        extras: readExtras(scheduled),
      }
    }
    previews[id] = { now: now.toISOString(), grades: preview }
  }

  return previews
}
