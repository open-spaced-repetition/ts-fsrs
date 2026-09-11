import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { fetchGitHubSponsors } from 'sponsorkit'

const login = process.env.SPONSORKIT_GITHUB_LOGIN ?? 'ishiko732'
const token = process.env.SPONSORKIT_GITHUB_TOKEN
const type =
  process.env.SPONSORKIT_GITHUB_TYPE === 'organization'
    ? 'organization'
    : 'user'

const target = fileURLToPath(new URL('../.sponsors.json', import.meta.url))

if (!token) {
  console.warn(
    'SPONSORKIT_GITHUB_TOKEN is not set; skipping the sponsor fetch.'
  )
  writeFileSync(target, '[]\n')
  process.exit(0)
}

let sponsorships
try {
  sponsorships = await fetchGitHubSponsors(token, login, type, {
    includePastSponsors: true,
  })
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error)
  console.warn(`Skipping the sponsor fetch: ${reason}`)
  writeFileSync(target, '[]\n')
  process.exit(0)
}

const seen = new Set()
const sponsors = sponsorships
  .filter((sponsorship) => sponsorship.privacyLevel !== 'PRIVATE')
  .sort(
    (a, b) =>
      Number(a.monthlyDollars < 0) - Number(b.monthlyDollars < 0) ||
      b.monthlyDollars - a.monthlyDollars
  )
  .flatMap(({ sponsor, monthlyDollars }) => {
    if (seen.has(sponsor.login)) return []
    seen.add(sponsor.login)
    return [
      {
        login: sponsor.login,
        name: sponsor.name ?? sponsor.login,
        avatarUrl: sponsor.avatarUrl,
        linkUrl: sponsor.linkUrl ?? `https://github.com/${sponsor.login}`,
        isPast: monthlyDollars < 0,
      },
    ]
  })

writeFileSync(target, `${JSON.stringify(sponsors, null, 2)}\n`)
console.log(`Wrote ${sponsors.length} sponsors to ${target}`)
