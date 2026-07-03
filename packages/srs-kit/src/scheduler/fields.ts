import type { Grade } from '@/primitives/rating.js'
import type { State } from '@/primitives/state.js'

export type SchedulerCoreFields<ScheduleStatus extends string = string> = {
  readonly state: State
  readonly scheduleStatus: ScheduleStatus
  readonly scheduledDays: number
}

export type SchedulerRevlogCoreFields<
  ScheduleStatus extends string = string,
> = SchedulerCoreFields<ScheduleStatus> & {
  readonly rating: Grade
}
