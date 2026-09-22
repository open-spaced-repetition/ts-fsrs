import { describe, test } from 'vitest'
import { withCache } from '@/schema/index.js'

let cacheSink = 0

function consume(value: number | undefined): void {
  cacheSink = (cacheSink + (value ?? 0)) % Number.MAX_SAFE_INTEGER
}

describe('withCache', () => {
  const keys = [1, 2, 3, 4] as const
  const hitCache = withCache((key: number) => key * 2)
  const undefinedCache = withCache((key: number) =>
    key === 0 ? undefined : key * 2
  )
  const missCache = withCache((key: number) => key * 2)
  const cycleCache = withCache((key: number) => key * 2)
  let missKey = 0
  let cycleIndex = 0

  hitCache(1)
  undefinedCache(0)
  for (const key of keys) {
    cycleCache(key)
  }

  test('cache hit', async ({ bench }) => {
    await bench('cache hit', () => {
      consume(hitCache(1))
    }).run()
  })

  test('cached undefined hit', async ({ bench }) => {
    await bench('cached undefined hit', () => {
      consume(undefinedCache(0))
    }).run()
  })

  test('cache miss', async ({ bench }) => {
    await bench('cache miss', () => {
      missKey += 1
      consume(missCache(missKey))
    }).run()
  })

  test('4-key cycle', async ({ bench }) => {
    await bench('4-key cycle', () => {
      const key = keys[cycleIndex & 3]
      cycleIndex += 1
      consume(cycleCache(key))
    }).run()
  })
})
