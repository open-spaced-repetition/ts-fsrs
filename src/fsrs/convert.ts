import {
  type Card,
  type CardInput,
  Rating,
  type ReviewLog,
  type ReviewLogInput,
  State,
} from './models'

export class TypeConvert {
  static card<T extends Card | CardInput>(card: T): Card {
    return {
      ...card,
      state: TypeConvert.state(card.state),
      due: TypeConvert.time(card.due),
      last_review: card.last_review
        ? TypeConvert.time(card.last_review)
        : undefined,
    } as Card
  }
  static rating(value: unknown): Rating {
    if (typeof value === 'string') {
      const firstLetter = value.charAt(0).toUpperCase()
      const restOfString = value.slice(1).toLowerCase()
      const ret = Rating[`${firstLetter}${restOfString}` as keyof typeof Rating]
      if (ret === undefined) {
        throw new Error(`Invalid rating:[${value}]`)
      }
      return ret
    } else if (typeof value === 'number') {
      return value as Rating
    }
    throw new Error(`Invalid rating:[${value}]`)
  }
  static state(value: unknown): State {
    if (typeof value === 'string') {
      const firstLetter = value.charAt(0).toUpperCase()
      const restOfString = value.slice(1).toLowerCase()
      const ret = State[`${firstLetter}${restOfString}` as keyof typeof State]
      if (ret === undefined) {
        throw new Error(`Invalid state:[${value}]`)
      }
      return ret
    } else if (typeof value === 'number') {
      return value as State
    }
    throw new Error(`Invalid state:[${value}]`)
  }
  static time(value: unknown): Date {
    if (typeof value === 'object' && value instanceof Date) {
      return value
    } else if (typeof value === 'string') {
      const timestamp = Date.parse(value)
      if (!Number.isNaN(timestamp)) {
        return new Date(timestamp)
      } else {
        throw new Error(`Invalid date:[${value}]`)
      }
    } else if (typeof value === 'number') {
      return new Date(value)
    }
    throw new Error(`Invalid date:[${value}]`)
  }
  static review_log(log: ReviewLogInput | ReviewLog): ReviewLog {
    return {
      ...log,
      due: TypeConvert.time(log.due),
      rating: TypeConvert.rating(log.rating),
      state: TypeConvert.state(log.state),
      review: TypeConvert.time(log.review),
    } satisfies ReviewLog
  }
}
