// Shared playground code travels in the URL fragment so it never reaches the
// server: fragments are not sent with requests, and the docs site is static.

const SHARE_PARAMETER = 'code'

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

export function encodeSharedCode(code: string): string {
  return toBase64Url(new TextEncoder().encode(code))
}

export function decodeSharedCode(encoded: string): string | undefined {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(
      fromBase64Url(encoded)
    )
  } catch {
    // A hand-edited or truncated fragment is not shared code; fall back to the
    // default scenario rather than failing the page.
    return undefined
  }
}

/**
 * Reads shared code from a fragment such as `#code=…`. Shared code arrives as
 * its own scenario, so the link needs no tab identity.
 */
export function readSharedCode(hash: string): string | undefined {
  const parameters = new URLSearchParams(
    hash.startsWith('#') ? hash.slice(1) : hash
  )
  const encoded = parameters.get(SHARE_PARAMETER)
  if (encoded === null) return undefined
  return decodeSharedCode(encoded)
}

/** Builds a permalink for `code`, discarding any fragment already in `href`. */
export function createShareUrl(href: string, code: string): string {
  const url = new URL(href)
  url.hash = new URLSearchParams({
    [SHARE_PARAMETER]: encodeSharedCode(code),
  }).toString()
  return url.toString()
}
