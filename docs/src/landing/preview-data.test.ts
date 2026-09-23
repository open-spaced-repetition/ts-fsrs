import path from 'node:path'
import { Rating } from 'ts-fsrs'
import { describe, expect, it } from 'vitest'
import { collectLandingPreviews } from './preview'
import { formatInterval } from './preview-data'
import { readLandingSnippetFiles } from './snippets'

const docsRoot = path.resolve(import.meta.dirname, '../..')
const previews = collectLandingPreviews()

describe('landing preview data', () => {
  it('runs every snippet the tabs offer', () => {
    expect(Object.keys(previews)).toEqual(['compose', 'default', 'extend'])
  })

  // The highlighted tabs come from the directory listing, the rows from the
  // imported modules, and a snippet the panel never runs would slip past both.
  it('runs every snippet file on disk', () => {
    expect(Object.keys(previews).sort()).toEqual([
      ...readLandingSnippetFiles(docsRoot).keys(),
    ])
  })

  it('covers every grade the list renders', () => {
    for (const preview of Object.values(previews)) {
      expect(Object.keys(preview.grades).map(Number)).toEqual([
        Rating.Again,
        Rating.Hard,
        Rating.Good,
        Rating.Easy,
      ])
    }
  })

  it('shows what each snippet is there to show', () => {
    expect(previews.default.grades[Rating.Again].scheduleStatus).toBe(
      'learning'
    )
    expect(previews.compose.grades[Rating.Again].scheduleStatus).toBe(
      'suspended'
    )
  })

  it.each([
    [0, '0 分'],
    [1, '1 分'],
    [5.5, '5.50 分'],
    [59, '59 分'],
    [60, '1 時間'],
    [90, '1.50 時間'],
    [1440, '1 日'],
    [53 * 1440 + 20 * 60 + 52, '53.87 日'],
  ])(
    'formats %s minutes with one unit and two decimals only for non-integers',
    (minutes, expected) => {
      const now = '2026-01-01T00:00:00.000Z'
      const dueAt = new Date(Date.parse(now) + minutes * 60_000).toISOString()
      expect(formatInterval('ja-JP', now, dueAt)).toBe(expected)
    }
  )

  it('localizes the interval in every site locale', () => {
    const format = (locale: string) =>
      Object.values(previews.default.grades).map((row) =>
        formatInterval(locale, previews.default.now, row.dueAt)
      )

    // Also catches Node builds without full ICU data.
    expect(format('en-US')).not.toEqual(format('zh-CN'))
    expect(format('zh-CN')).not.toEqual(format('zh-TW'))
    expect(format('zh-TW')).not.toEqual(format('ja-JP'))
    expect(format('zh-CN')).not.toEqual(format('ja-JP'))
  })
})
