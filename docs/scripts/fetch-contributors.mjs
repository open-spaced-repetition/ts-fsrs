import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const repository =
  process.env.CONTRIBUTORS_REPO ?? 'open-spaced-repetition/ts-fsrs'
const token =
  process.env.CONTRIBUTORS_GITHUB_TOKEN ??
  process.env.GITHUB_TOKEN ??
  process.env.SPONSORKIT_GITHUB_TOKEN

const target = fileURLToPath(new URL('../.contributors.json', import.meta.url))

/**
 * The subset of the REST response this script keeps.
 *
 * @typedef {object} ApiContributor
 * @property {string} login
 * @property {string} avatar_url
 * @property {string} html_url
 * @property {number} contributions
 * @property {string} [type]
 */

/**
 * @param {number} page
 * @returns {Promise<readonly ApiContributor[]>}
 */
async function fetchPage(page) {
  const response = await fetch(
    `https://api.github.com/repos/${repository}/contributors?per_page=100&page=${page}`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'ts-fsrs-docs',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  )
  if (!response.ok) {
    throw new Error(
      `GitHub returned ${response.status} ${response.statusText} for ${repository} contributors`
    )
  }
  return /** @type {readonly ApiContributor[]} */ (await response.json())
}

/** @type {ApiContributor[]} */
const raw = []
try {
  for (let page = 1; ; page += 1) {
    const batch = await fetchPage(page)
    raw.push(...batch)
    if (batch.length < 100) break
  }
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error)
  console.warn(`Skipping the contributor fetch: ${reason}`)
  writeFileSync(target, '[]\n')
  process.exit(0)
}

// Dependabot and github-actions account for a large share of the commits but
// are not people, and crediting them next to human contributors reads as noise.
const contributors = raw
  .filter(
    (entry) => entry.type === 'User' && !String(entry.login).endsWith('[bot]')
  )
  .sort((a, b) => b.contributions - a.contributions)
  .map((entry) => ({
    login: entry.login,
    avatarUrl: entry.avatar_url,
    linkUrl: entry.html_url,
    contributions: entry.contributions,
  }))

writeFileSync(target, `${JSON.stringify(contributors, null, 2)}\n`)
console.log(`Wrote ${contributors.length} contributors to ${target}`)
