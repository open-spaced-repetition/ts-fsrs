import { useI18n } from '@rspress/core/runtime'
import { landingContributors } from '@/landing/runtime'
import { cn } from '@/utils/cn'
import { AvatarWall } from './AvatarWall'
import { Section } from './Section'
import * as styles from './styles'

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
            'inline-flex items-center gap-2 font-[650]',
            styles.outlinedAction
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
