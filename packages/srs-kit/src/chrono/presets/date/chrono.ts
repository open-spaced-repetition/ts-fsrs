import { defineChrono } from '@/chrono/define-chrono.js'
import { dateSchema } from '@/schema/field.js'
import {
  dateCardFieldsSchema,
  dateRevlogFieldsSchema,
  MS_PER_DAY,
} from './schema.js'

export const dateChrono = defineChrono({
  schema: {
    card: dateCardFieldsSchema,
    revlog: dateRevlogFieldsSchema,
    time: dateSchema,
  },
  projection(value) {
    const card = dateCardFieldsSchema['~standard'].validate(value.card)
    if (card.issues) {
      return card
    }

    const time = dateSchema['~standard'].validate(value.time)
    if (time.issues) {
      return time
    }

    return {
      value: {
        previous: value.card.lastReviewAt ?? time.value,
        current: time.value,
      },
    }
  },
  defaultValue: {
    card({ previous, time }) {
      return {
        dueAt: time,
        lastReviewAt: previous?.current ?? null,
      }
    },
    revlog({ time, previous }) {
      return {
        dueAt: previous?.current ?? time,
        lastReviewAt: previous?.previous ?? time,
      }
    },
  },
  create() {
    const difference = (from: Date, to: Date): number =>
      dateDiffInDays(from, to)

    const add = (from: Date, days: number): Date =>
      new Date(from.getTime() + days * MS_PER_DAY)

    return {
      difference,
      add,
    }
  },
})

export function dateDiffInDays(last: Date, cur: Date): number {
  const utc1 = Date.UTC(
    last.getUTCFullYear(),
    last.getUTCMonth(),
    last.getUTCDate()
  )
  const utc2 = Date.UTC(
    cur.getUTCFullYear(),
    cur.getUTCMonth(),
    cur.getUTCDate()
  )

  return Math.floor((utc2 - utc1) / MS_PER_DAY)
}
