import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { readLandingContributors, readLandingSponsors } from './community'

describe('landing community data', () => {
  it('accepts GitHub web URLs', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'ts-fsrs-community-'))
    writeFileSync(
      path.join(dir, '.contributors.json'),
      JSON.stringify([
        {
          login: 'octocat',
          avatarUrl: 'https://avatars.githubusercontent.com/u/583231',
          linkUrl: 'https://github.com/octocat',
          contributions: 1,
        },
      ])
    )
    expect(readLandingContributors(dir)).toHaveLength(1)
  })

  it('treats a missing file as the offline case', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'ts-fsrs-community-'))
    expect(readLandingContributors(dir)).toEqual([])
    expect(readLandingSponsors(dir)).toEqual([])
  })

  it('reports a file it cannot parse', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'ts-fsrs-community-'))
    writeFileSync(path.join(dir, '.sponsors.json'), '{ not json')
    expect(() => readLandingSponsors(dir)).toThrow('is not valid JSON')
  })

  it('rejects non-web links', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'ts-fsrs-community-'))
    writeFileSync(
      path.join(dir, '.contributors.json'),
      JSON.stringify([
        {
          login: 'bad',
          avatarUrl: 'https://example.com/avatar.png',
          linkUrl: 'javascript:alert(1)',
          contributions: 1,
        },
      ])
    )
    expect(() => readLandingContributors(dir)).toThrow('expected shape')
  })

  it('keeps current and past sponsors without exposing amounts', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'ts-fsrs-community-'))
    writeFileSync(
      path.join(dir, '.sponsors.json'),
      JSON.stringify([
        {
          login: 'current',
          name: 'Current',
          avatarUrl: 'https://example.com/current.png',
          linkUrl: 'https://example.com/current',
          isPast: false,
        },
        {
          login: 'past',
          name: 'Past',
          avatarUrl: 'https://example.com/past.png',
          linkUrl: 'https://example.com/past',
          isPast: true,
        },
      ])
    )
    expect(
      readLandingSponsors(dir).map(({ login, isPast }) => [login, isPast])
    ).toEqual([
      ['current', false],
      ['past', true],
    ])
  })
})
