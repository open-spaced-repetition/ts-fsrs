import { z } from 'zod'
import {
  type Release,
  releaseSchema,
  repository,
} from '../src/releases/index.ts'

export async function fetchReleases(
  token: string | undefined,
  request: typeof fetch = fetch
): Promise<Release[]> {
  const releases: Release[] = []
  for (let page = 1; ; page++) {
    const response = await request(
      `https://api.github.com/repos/${repository}/releases?per_page=100&page=${page}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: AbortSignal.timeout(30_000),
      }
    )
    if (!response.ok) {
      throw new Error(`Release lookup failed: GitHub HTTP ${response.status}`)
    }
    const batch = z.array(releaseSchema).parse(await response.json())
    releases.push(...batch)
    if (batch.length < 100) return releases
  }
}
