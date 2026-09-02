import { useI18n } from '@rspress/core/runtime'
import { landingContributors } from '@/landing/runtime'
import { cn } from '@/utils/cn'
import { AvatarWall } from './AvatarWall'
import { Section } from './Section'

const CONTRIBUTORS_URL =
  'https://github.com/open-spaced-repetition/ts-fsrs/graphs/contributors'

export function Contributors() {
  const t = useI18n<typeof import('i18n')>()

  return (
    <Section
      description={t('home.contributors.description')}
      eyebrow={t('home.contributors.eyebrow')}
      title={t('home.contributors.title')}
    >
      {landingContributors.length > 0 && (
        <div className="mb-8">
          <AvatarWall
            entries={landingContributors.map((contributor) => ({
              login: contributor.login,
              avatarUrl: contributor.avatarUrl,
              linkUrl: contributor.linkUrl,
              title: `${contributor.login} · ${contributor.contributions}`,
            }))}
          />
        </div>
      )}

      <p className="m-0 text-center">
        <a
          className={cn(
            'inline-flex items-center gap-2 rounded-xl border border-line',
            'bg-surface px-4 py-2 text-[13px] font-[650] text-body no-underline',
            'transition-colors duration-200 hover:border-line-strong',
            'motion-reduce:transition-none'
          )}
          href={CONTRIBUTORS_URL}
          rel="noreferrer"
          target="_blank"
        >
          {t('home.contributors.cta')}
        </a>
      </p>
    </Section>
  )
}
