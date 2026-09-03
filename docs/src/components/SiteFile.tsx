import { withBase } from '@rspress/core/runtime'

type Props = {
  readonly path: string
}

// Generated files such as llms.txt and the RSS feeds are build outputs rather
// than routes, so they cannot be written as Markdown links: the dead-link check
// resolves those against the route table. Rendering the anchor here also keeps
// the printed path correct once the site is served under a `base`.
export default function SiteFile({ path }: Props) {
  const href = withBase(path)

  return (
    <a href={href}>
      <code>{href}</code>
    </a>
  )
}
