import { describe, expect, expectTypeOf, it } from 'vitest'
import { SRSSchemaError } from '@/schema/index.js'
import {
  type ScheduleStatus,
  scheduleStatuses,
  scheduleStatusSchema,
} from './status.js'

describe('ScheduleStatus', () => {
  it('defines fixed schedule status values and schema', () => {
    expect(scheduleStatuses).toEqual(['new', 'learning', 'review'])
    expect(scheduleStatusSchema.parse('new')).toBe('new')
    expect(scheduleStatusSchema.parse('learning')).toBe('learning')
    expect(scheduleStatusSchema.parse('review')).toBe('review')
    expect(() => scheduleStatusSchema.parse('relearning')).toThrow(
      SRSSchemaError
    )
    expectTypeOf<ScheduleStatus>().toEqualTypeOf<
      'new' | 'learning' | 'review'
    >()
  })

  it('prevents mutation of scheduleStatuses', () => {
    expect(() => {
      ;(scheduleStatuses as unknown as string[])[0] = 'invalid'
    }).toThrow(TypeError)
    expect(() => {
      ;(scheduleStatuses as unknown as string[]).push('invalid')
    }).toThrow(TypeError)
  })
})
