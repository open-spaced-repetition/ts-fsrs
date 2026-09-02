import path from 'node:path'
import { Rating } from 'ts-fsrs'
import { beforeAll, describe, expect, it } from 'vitest'
import { collectLandingPreviews } from './preview'
import {
  formatInterval,
  intervalFrom,
  type LandingPreviews,
} from './preview-data'
import { readLandingSnippetFiles } from './snippets'

const docsRoot = path.resolve(import.meta.dirname, '../..')

describe('landing preview data', () => {
  let previews: LandingPreviews

  beforeAll(async () => {
    previews = await collectLandingPreviews(readLandingSnippetFiles(docsRoot))
  })

  it('runs every snippet the tabs offer', () => {
    expect(Object.keys(previews)).toEqual(['compose', 'default', 'extend'])
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

  it('splits the interval into parts Intl can word', () => {
    const parts = Object.values(previews).flatMap((preview) =>
      Object.values(preview.grades).map((row) =>
        intervalFrom(preview.now, row.dueAt)
      )
    )

    expect(parts.every((part) => Number.isFinite(part.days))).toBe(true)
    expect(parts.some((part) => part.minutes !== 0)).toBe(true)
  })

  it('renders the parts through Intl in every site locale', () => {
    const format = (locale: string) =>
      Object.values(previews.default.grades).map((row) =>
        formatInterval(locale, previews.default.now, row.dueAt)
      )

    // Also catches Node builds without full ICU data.
    expect(format('en-US')).not.toEqual(format('zh-CN'))
    expect(format('zh-CN')).not.toEqual(format('ja-JP'))
  })
})
