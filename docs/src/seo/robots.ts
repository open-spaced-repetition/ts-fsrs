import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { RspressPlugin } from '@rspress/core'

type Options = {
  readonly siteOrigin: string
  readonly base: string
  readonly outDir: string
  /**
   * Every deployment other than the production one is a duplicate of it, so
   * crawling is opt-in rather than the default.
   */
  readonly indexable: boolean
}

// Crawlers that read the site on behalf of an assistant. They are listed
// explicitly because a bare `User-agent: *` leaves their access to whichever
// default the operator happens to apply, and this documentation is meant to be
// quotable: see src/en-US/guide/llms.mdx.
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'PerplexityBot',
  'Google-Extended',
  'Applebot-Extended',
]

function render({
  siteOrigin,
  base,
  indexable,
}: Omit<Options, 'outDir'>): string {
  if (!indexable) {
    return `# Preview deployment: a duplicate of the production site.\nUser-agent: *\nDisallow: /\n`
  }

  const absolute = (file: string) => new URL(base + file, siteOrigin).href
  const groups = [`User-agent: *\nAllow: /`]
  for (const crawler of AI_CRAWLERS) {
    groups.push(`User-agent: ${crawler}\nAllow: /`)
  }

  return `${groups.join('\n\n')}

Sitemap: ${absolute('sitemap.xml')}

# Documentation index for LLMs: ${absolute('llms.txt')}
# Full documentation bundle: ${absolute('llms-full.txt')}
`
}

// `public/` cannot hold this file: the `Sitemap` directive has to be an
// absolute URL, and the origin is only known once a deployment sets
// DOCS_SITE_ORIGIN at build time.
export function pluginRobotsTxt(options: Options): RspressPlugin {
  return {
    name: 'ts-fsrs-robots-txt',
    async afterBuild(_config, isProd) {
      if (!isProd) return
      await writeFile(
        path.join(options.outDir, 'robots.txt'),
        render(options),
        'utf8'
      )
    },
  }
}

export const renderRobotsTxt = render
