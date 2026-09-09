import { isObject } from './utils.js'
import { defineSchema } from './validators.js'

export type FractionalDaysConfig = {
  readonly fractionalDays: boolean
}

export const fractionalDaysConfigSchema = defineSchema<
  Partial<FractionalDaysConfig>,
  FractionalDaysConfig
>((value) => {
  if (!isObject(value)) {
    return { issues: [{ message: 'Expected fractional days config' }] }
  }
  const fractionalDays =
    value.fractionalDays === undefined ? false : value.fractionalDays
  if (typeof fractionalDays !== 'boolean') {
    return { issues: [{ message: 'Expected fractionalDays to be a boolean' }] }
  }
  return { value: { fractionalDays } }
})
