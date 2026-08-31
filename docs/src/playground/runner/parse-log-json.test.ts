import { describe, expect, it } from 'vitest'
import { parseLogJson } from './parse-log-json'

describe('parseLogJson', () => {
  it.each([
    ['object', '{"dueAt":"2026-01-03T00:00:00.000Z","state":2}'],
    ['array', '[0.212,1.2931,2.3065]'],
    ['indented output', '{\n  "stability": 2.3065\n}'],
    ['surrounding whitespace', '  {"a":1}\n'],
    ['nested', '{"preview":[{"grade":1,"card":{"stability":0.2}}]}'],
  ])('parses %s', (_label, text) => {
    expect(parseLogJson(text)).toEqual(JSON.parse(text.trim()))
  })

  it.each([
    ['plain text', 'Training finished in 812 ms'],
    ['a number', '42'],
    ['a quoted string', '"ready"'],
    ['a boolean', 'true'],
    ['null', 'null'],
    ['an empty line', ''],
    ['a stack trace', 'Error: boom\n    at run (playground.ts:3:9)'],
    ['truncated JSON', '{"weights":[0.2,'],
    // Looks like an array but is prose the example printed.
    ['bracketed prose', '[worker] ready'],
  ])('returns undefined for %s', (_label, text) => {
    expect(parseLogJson(text)).toBeUndefined()
  })
})
