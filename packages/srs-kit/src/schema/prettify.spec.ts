import { expectTypeOf, test } from 'vitest'
import * as z from 'zod/mini'
import type { Prettify } from './helper.js'
import type { SchemaOutput } from './standard.js'

test('Prettify expands intersected object shapes', () => {
  const schema = z.enum(['small', 'large'])

  expectTypeOf<
    Prettify<{ readonly size: SchemaOutput<typeof schema> } & { count: 1 }>
  >().toEqualTypeOf<{ readonly size: 'small' | 'large'; count: 1 }>()
})
