import { isObject } from './utils.js'
import { defineSchema } from './validators.js'

type StringField<Field extends string> = {
  readonly [K in Field]: string
}

interface StringFieldSchemaOptions<Field extends string> {
  readonly field: Field
  readonly message: string
}

export function defineStringFieldSchema<const Field extends string>({
  field,
  message,
}: StringFieldSchemaOptions<Field>) {
  return defineSchema<StringField<Field>>((value) => {
    if (isObject(value) && typeof value[field] === 'string') {
      return {
        value: { [field]: value[field] } as StringField<Field>,
      }
    }
    return { issues: [{ message }] }
  })
}

export function defineStringFieldOutputSchema<const Field extends string>({
  field,
  message,
}: StringFieldSchemaOptions<Field>) {
  return defineSchema<unknown, StringField<Field>>((value) => {
    if (isObject(value) && typeof value[field] === 'string') {
      return {
        value: { [field]: value[field] } as StringField<Field>,
      }
    }
    return { issues: [{ message }] }
  })
}
