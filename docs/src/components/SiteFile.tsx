import { withBase } from '@rspress/core/runtime'

type Props = {
  readonly path: string
}

// Links a build output such as llms.txt, which a Markdown link cannot: remark's
// `autoPrefix` skips `base` for non-route extensions. Keep this inline in a
// paragraph — SSG-MD serializes JSX in a table cell or list item verbatim.
export default function SiteFile({ path }: Props) {
  const href = withBase(path)

  return (
    <a href={href}>
      <code>{href}</code>
    </a>
  )
}
