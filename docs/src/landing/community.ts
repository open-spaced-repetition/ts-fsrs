import { readFileSync } from 'node:fs'
import path from 'node:path'
import { z } from 'zod'

const webUrl = z.url({ protocol: /^https?$/ })

const sponsorSchema = z.object({
  login: z.string().min(1),
  name: z.string().min(1),
  avatarUrl: webUrl,
  linkUrl: webUrl,
  isPast: z.boolean(),
})

const contributorSchema = z.object({
  login: z.string().min(1),
  avatarUrl: webUrl,
  linkUrl: webUrl,
  contributions: z.number().int().nonnegative(),
})

export type LandingSponsor = z.infer<typeof sponsorSchema>
export type LandingContributor = z.infer<typeof contributorSchema>

function readList<T>(
  docsRoot: string,
  file: string,
  schema: z.ZodType<T>
): T[] {
  let raw: string
  try {
    raw = readFileSync(path.join(docsRoot, file), 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    throw new Error(
      `${file} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  const result = z.array(schema).safeParse(parsed)
  if (!result.success) {
    throw new Error(
      `${file} does not match the expected shape:\n${z.prettifyError(result.error)}`
    )
  }
  return result.data
}

export function readLandingSponsors(docsRoot: string): LandingSponsor[] {
  return readList(docsRoot, '.sponsors.json', sponsorSchema)
}

export function readLandingContributors(
  docsRoot: string
): LandingContributor[] {
  return readList(docsRoot, '.contributors.json', contributorSchema)
}
