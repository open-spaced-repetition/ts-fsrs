import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCardId } from './card-id.js'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('createCardId', () => {
  it('uses crypto.randomUUID when available', () => {
    const randomUUID = vi.fn(() => '00000000-0000-4000-8000-000000000001')
    vi.stubGlobal('crypto', { randomUUID })

    expect(createCardId()).toBe('00000000-0000-4000-8000-000000000001')
    expect(randomUUID).toHaveBeenCalledOnce()
  })

  it('formats a UUID v4 with getRandomValues when randomUUID is absent', () => {
    vi.stubGlobal('crypto', {
      getRandomValues(bytes: Uint8Array) {
        bytes.fill(0)
        return bytes
      },
    })

    expect(createCardId()).toBe('00000000-0000-4000-8000-000000000000')
  })

  it('falls back to Math.random when Web Crypto is absent', () => {
    vi.stubGlobal('crypto', undefined)
    vi.spyOn(Math, 'random').mockReturnValue(0)

    expect(createCardId()).toBe('00000000-0000-4000-8000-000000000000')
  })
})
