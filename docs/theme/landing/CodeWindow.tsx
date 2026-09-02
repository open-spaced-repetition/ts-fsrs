import { memo } from 'react'
import type { LandingSnippet } from '@/landing/snippets'
import { cn } from '@/utils/cn'

type Props = {
  readonly snippet: LandingSnippet
  readonly className?: string
}

// Avoid replacing the Shiki node and resetting its scroll on copy feedback.
const Highlighted = memo(function Highlighted({ html }: { html: string }) {
  // biome-ignore lint/security/noDangerouslySetInnerHtml: build-time Shiki output for a checked-in snippet.
  return <div dangerouslySetInnerHTML={{ __html: html }} />
})

export function CodeWindow({ snippet, className }: Props) {
  return (
    <div className={cn('landing-code relative', className)}>
      <Highlighted html={snippet.html} />
    </div>
  )
}
