import { defineSchema } from '@/schema/index.js'

export const scheduleStatuses = Object.freeze([
  'new',
  'learning',
  'review',
] as const)

export type ScheduleStatus = (typeof scheduleStatuses)[number]

export const scheduleStatusSchema = defineSchema<ScheduleStatus>((value) =>
  value === 'new' || value === 'learning' || value === 'review'
    ? { value }
    : { issues: [{ message: 'Expected schedule status' }] }
)
