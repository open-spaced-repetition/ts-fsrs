import {
  type Grade,
  gradeSchema,
  grades,
  Rating,
  ratingSchema,
} from '@/primitives/rating.js'
import {
  defaultRatingScale,
  type RatingScale,
  type RatingScaleEntry,
} from '@/primitives/rating-scale.js'
import {
  defineSchema,
  isFiniteNumber,
  isObject,
  type SRSSchema,
} from '@/schema/index.js'

export interface SchedulerRatings<
  G extends number = number,
  R extends number = number,
  PreviewGrade extends number = G,
> {
  readonly scale: RatingScale
  readonly grades: readonly G[]
  readonly preview: readonly PreviewGrade[]
  /** Ratings that are not grades; wide `number` grades leave this `number`. */
  readonly manual: readonly (number extends G ? number : Exclude<R, G>)[]
  readonly gradeSchema: SRSSchema<{ input: G; output: G }>
  readonly ratingSchema: SRSSchema<{ input: R; output: R }>
  readonly isLapse: (grade: number) => boolean
  readonly isManual: (rating: number) => boolean
}

type SchedulerPreviewOption = { readonly grades: readonly number[] }

const ascending = (left: number, right: number): number => left - right

const defaultManual = Object.freeze([Rating.Manual] as const)
const isDefaultLapse = (grade: number): boolean => grade === Rating.Again
const isDefaultManual = (rating: number): boolean => rating === Rating.Manual

/** Default-scale ratings; every variant shares the default schemas. */
function createDefaultSchedulerRatings<PreviewGrade extends number>(
  preview: readonly PreviewGrade[]
): SchedulerRatings<Grade, Rating, PreviewGrade> {
  return Object.freeze({
    scale: defaultRatingScale,
    grades,
    preview,
    manual: defaultManual,
    gradeSchema,
    ratingSchema,
    isLapse: isDefaultLapse,
    isManual: isDefaultManual,
  })
}

export const defaultSchedulerRatings = createDefaultSchedulerRatings(grades)

export function createSchedulerRatings(
  scale: RatingScale,
  preview?: SchedulerPreviewOption
): SchedulerRatings {
  if (scale !== defaultRatingScale) {
    return createCustomSchedulerRatings(scale, preview)
  }
  return preview === undefined
    ? defaultSchedulerRatings
    : createDefaultSchedulerRatings(
        resolvePreviewGrades(preview, grades, isDefaultManual)
      )
}

function createCustomSchedulerRatings(
  scale: RatingScale,
  preview: SchedulerPreviewOption | undefined
): SchedulerRatings {
  // 1. Validate each entry and snapshot it with only `value` and its flag, so
  //    later mutation of the input cannot leak in.
  const names = new Map<number, string>()
  const snapshot: [name: string, entry: RatingScaleEntry][] = []
  for (const [name, entry] of Object.entries(scale)) {
    if (!isObject(entry)) {
      throw new Error(
        `Invalid rating scale entry "${name}": expected an object`
      )
    }
    const { value } = entry
    if (!isFiniteNumber(value)) {
      throw new Error(
        `Invalid rating scale entry "${name}": value must be a finite number`
      )
    }
    const { manual, lapse } = entry
    if (manual !== undefined && typeof manual !== 'boolean') {
      throw new Error(
        `Invalid rating scale entry "${name}": manual must be boolean`
      )
    }
    if (lapse !== undefined && typeof lapse !== 'boolean') {
      throw new Error(
        `Invalid rating scale entry "${name}": lapse must be boolean`
      )
    }
    if (manual && lapse) {
      throw new Error(
        `Invalid rating scale entry "${name}": cannot be both manual and lapse`
      )
    }
    const existing = names.get(value)
    if (existing !== undefined) {
      throw new Error(
        `Duplicate rating scale value ${value} on entry "${name}" (already used by "${existing}")`
      )
    }
    names.set(value, name)
    snapshot.push([
      name,
      Object.freeze(
        manual ? { value, manual } : lapse ? { value, lapse } : { value }
      ),
    ])
  }

  // 2. Sorted values by role.
  const valuesOf = (keep: (entry: RatingScaleEntry) => unknown) =>
    snapshot
      .filter(([, entry]) => keep(entry))
      .map(([, entry]) => entry.value)
      .sort(ascending)
  const gradeValues = Object.freeze(valuesOf((entry) => !entry.manual))
  const manualValues = Object.freeze(valuesOf((entry) => entry.manual))
  const lapseSet = new Set(valuesOf((entry) => entry.lapse))

  // 3. Lapse grades sort below at least one non-lapse grade.
  const lowestNonLapse = gradeValues.find((grade) => !lapseSet.has(grade))
  if (lowestNonLapse === undefined) {
    throw new Error(
      'Invalid rating scale: at least one non-lapse grade is required'
    )
  }
  const highestLapse = Math.max(...lapseSet)
  if (highestLapse > lowestNonLapse) {
    throw new Error(
      `Invalid rating scale entry "${names.get(highestLapse)}" (${highestLapse}): lapse grade must be lower than non-lapse grade "${names.get(lowestNonLapse)}" (${lowestNonLapse})`
    )
  }

  const manualSet = new Set(manualValues)
  const isManual = (rating: number) => manualSet.has(rating)
  return Object.freeze({
    // fromEntries defines own data properties, so a "__proto__" key stays an entry.
    scale: Object.freeze(Object.fromEntries(snapshot)),
    grades: gradeValues,
    preview:
      preview === undefined
        ? gradeValues
        : resolvePreviewGrades(preview, gradeValues, isManual),
    manual: manualValues,
    gradeSchema: memberSchema(new Set(gradeValues), 'Expected grade'),
    ratingSchema: memberSchema(names, 'Expected rating'),
    isLapse: (grade: number) => lapseSet.has(grade),
    isManual,
  })
}

/** A number schema that accepts only the values in `members`. */
function memberSchema(
  members: { has(value: number): boolean },
  message: string
): SRSSchema<{ input: number; output: number }> {
  return defineSchema<number>((value) =>
    typeof value === 'number' && members.has(value)
      ? { value }
      : { issues: [{ message }] }
  )
}

function resolvePreviewGrades(
  preview: SchedulerPreviewOption,
  grades: readonly number[],
  isManual: (rating: number) => boolean
): readonly number[] {
  const input = isObject(preview) && preview.grades
  const snapshot = new Set<number>(Array.isArray(input) ? input : [])
  if (snapshot.size === 0) {
    throw new Error('Scheduler preview grades must be a non-empty array')
  }
  for (const grade of snapshot) {
    if (!grades.includes(grade)) {
      throw new Error(
        isManual(grade)
          ? `Invalid preview grade ${grade}: manual ratings cannot be previewed`
          : `Invalid preview grade ${grade}: not a grade in the rating scale`
      )
    }
  }
  return Object.freeze(Array.from(snapshot).sort(ascending))
}
