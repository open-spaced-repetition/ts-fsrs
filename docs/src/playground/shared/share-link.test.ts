import { describe, expect, it } from 'vitest'
import {
  createShareUrl,
  decodeSharedCode,
  encodeSharedCode,
  readSharedCode,
} from './share-link'

const PAGE = 'https://ts-fsrs.example/playground'

describe('playground share links', () => {
  it.each([
    ['ascii', "import { fsrs } from 'ts-fsrs'\n"],
    ['non-ascii', "// 复习调度 — スケジューリング\nconst weight = '≈0.4'\n"],
    ['emoji', 'console.log("🎉")'],
    ['empty-ish', ' '],
  ])('round-trips %s source', (_label, code) => {
    expect(decodeSharedCode(encodeSharedCode(code))).toBe(code)
  })

  it('produces fragment-safe output', () => {
    // Long, byte-varied input exercises every base64 alphabet position.
    const code = Array.from({ length: 256 }, (_, index) =>
      String.fromCharCode(index)
    ).join('')
    expect(encodeSharedCode(code)).toMatch(/^[\w-]+$/)
  })

  it('round-trips the shared code', () => {
    const code = 'const card = createEmptyCard()'
    const url = new URL(createShareUrl(PAGE, code))
    expect(url.pathname).toBe('/playground')
    expect(readSharedCode(url.hash)).toBe(code)
  })

  it('round-trips empty code', () => {
    const url = new URL(createShareUrl(PAGE, ''))
    expect(readSharedCode(url.hash)).toBe('')
  })

  it('replaces an existing fragment instead of appending', () => {
    const shared = createShareUrl(`${PAGE}#code=stale`, 'fresh')
    expect(readSharedCode(new URL(shared).hash)).toBe('fresh')
  })

  it('ignores a scenario left over from an older share link', () => {
    const code = encodeSharedCode('orphan')
    expect(readSharedCode(`#scenario=binding&code=${code}`)).toBe('orphan')
  })

  it.each([
    ['no fragment', ''],
    ['unrelated fragment', '#section-heading'],
    ['undecodable value', '#code=!!!not-base64!!!'],
    ['invalid utf-8', '#code=__8'],
  ])('returns undefined for %s', (_label, hash) => {
    expect(readSharedCode(hash)).toBeUndefined()
  })
})
