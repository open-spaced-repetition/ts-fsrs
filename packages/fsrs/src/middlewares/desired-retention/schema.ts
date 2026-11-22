import {
  defaultRatingScale,
  defineSchema,
  desiredRetentionSchema,
  type Grade,
  type IsSameType,
  isObject,
  type Prettify,
  type RatingScale,
  type RatingScaleCertainGradeOf,
  type RatingScaleGradeOf,
  type SRSSchema,
} from '@open-spaced-repetition/srs-kit'

export type DesiredRetentionConfig<
  GradeOrScale extends number | RatingScale = Grade,
> = {
  /** Must be strictly between 0 and 1. */
  readonly desiredRetention: [GradeOrScale] extends [number]
    ? Record<GradeOrScale, number>
    : GradeOrScale extends RatingScale
      ? Prettify<
          Record<RatingScaleCertainGradeOf<GradeOrScale>, number> &
            Partial<Record<ScaleGrade<GradeOrScale>, number>>
        >
      : never
}

export type DesiredRetentionConfigInput<G extends number = Grade> = {
  readonly desiredRetention: number | Record<G, number>
}

type ScaleGrade<Scale extends RatingScale> =
  IsSameType<RatingScaleGradeOf<Scale>, Grade> extends true
    ? Grade
    : RatingScaleGradeOf<Scale>

export function createDesiredRetentionConfigSchema<
  const Scale extends RatingScale,
>(
  scale: Scale
): SRSSchema<{
  input: DesiredRetentionConfigInput<ScaleGrade<Scale>>
  output: DesiredRetentionConfig<Scale>
}> {
  type G = ScaleGrade<Scale>
  const scaleGrades = Object.values(scale)
    .filter((entry) => !entry.manual)
    .map((entry) => entry.value as G)
    .sort((left, right) => left - right)

  return defineSchema<
    DesiredRetentionConfigInput<G>,
    DesiredRetentionConfig<Scale>
  >((value) => {
    if (!isObject(value)) {
      return { issues: [{ message: 'Expected desiredRetention in (0, 1)' }] }
    }
    const retention = value.desiredRetention
    const desiredRetention = {} as Record<G, number>
    if (typeof retention === 'number') {
      const result = desiredRetentionSchema.safeParse(retention)
      if (!result.success) {
        return { issues: [{ message: 'Expected desiredRetention in (0, 1)' }] }
      }
      for (const grade of scaleGrades) {
        desiredRetention[grade] = result.data
      }
    } else {
      if (!isObject(retention)) {
        return { issues: [{ message: 'Expected desiredRetention in (0, 1)' }] }
      }
      for (const grade of scaleGrades) {
        const result = desiredRetentionSchema.safeParse(retention[grade])
        if (!result.success) {
          return {
            issues: [{ message: 'Expected desiredRetention in (0, 1)' }],
          }
        }
        desiredRetention[grade] = result.data
      }
    }

    return { value: { desiredRetention } as DesiredRetentionConfig<Scale> }
  })
}

export const desiredRetentionConfigSchema: SRSSchema<{
  input: DesiredRetentionConfigInput
  output: DesiredRetentionConfig
}> = createDesiredRetentionConfigSchema(defaultRatingScale)
