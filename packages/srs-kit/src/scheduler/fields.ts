import type { Grade } from '@/primitives/rating.js'
import type { State } from '@/primitives/state.js'
import type { FlattenObject, IsSameType, LazyIterable } from '@/schema/index.js'

export type SchedulerCoreFields<ScheduleStatus extends string = string> = {
  readonly state: State
  readonly scheduleStatus: ScheduleStatus
}

// The default branches spell out `Grade` so hovers reuse the annotation
// instead of expanding it to `1 | 2 | 3 | 4`.
type RatingField<G extends number> =
  IsSameType<G, Grade> extends true
    ? { readonly rating: Grade }
    : { readonly rating: G }

type GradeField<G extends number> =
  IsSameType<G, Grade> extends true
    ? { readonly grade: Grade }
    : { readonly grade: G }

export type SchedulerRevlogCoreFields<
  ScheduleStatus extends string = string,
  G extends number = Grade,
> = SchedulerCoreFields<ScheduleStatus> & RatingField<G>

export type ScheduleResult<Card, Revlog> = FlattenObject<{
  card: { -readonly [Key in keyof Card]: Card[Key] }
  revlog: { -readonly [Key in keyof Revlog]: Revlog[Key] }
}>

export type PreviewItem<Card, Revlog, G extends number = Grade> = FlattenObject<
  {
    card: ScheduleResult<Card, Revlog>['card']
    revlog: ScheduleResult<Card, Revlog>['revlog']
  } & GradeField<G>
>

export interface PreviewResult<Env extends { card: object; revlog: object }>
  extends LazyIterable<PreviewItem<Env['card'], Env['revlog']>> {}
