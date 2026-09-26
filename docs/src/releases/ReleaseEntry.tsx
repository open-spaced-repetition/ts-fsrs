import { useLang } from '@rspress/core/runtime'
import { Link } from '@rspress/core/theme'
import type { ReactNode } from 'react'
import type { publishedUpdates } from './index'

interface ReleaseEntryProps {
  update: Omit<ReturnType<typeof publishedUpdates>[number], 'body'>
  children: ReactNode
}

export default function ReleaseEntry({ update, children }: ReleaseEntryProps) {
  const lang = useLang()
  const prefix = lang === 'en-US' ? '' : `/${lang}`
  return (
    <article className="release-update" aria-label={update.title}>
      <div className="release-update-heading">
        <h2>
          <Link href={`${prefix}/updates/${update.slug}`}>
            {update.version}
          </Link>
        </h2>
        <time dateTime={update.publishedAt}>
          {update.publishedAt.slice(0, 10)} UTC
        </time>
      </div>
      <div className="release-update-links">
        <Link href={update.npmUrl}>npmx</Link>
        {' · '}
        <Link href={update.url}>GitHub Release</Link>
      </div>
      <div className="release-update-body">{children}</div>
    </article>
  )
}
