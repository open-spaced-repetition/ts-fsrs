import { useI18n } from '@rspress/core/runtime'
import { landingSponsors } from '@/landing/runtime'
import { cn } from '@/utils/cn'
import { AvatarWall } from './AvatarWall'
import { Section } from './Section'
import * as styles from './styles'

const SPONSOR_URL = 'https://github.com/sponsors/ishiko732'

export function Sponsors() {
  const t = useI18n<typeof import('i18n')>()
  const currentSponsors = landingSponsors.filter((sponsor) => !sponsor.isPast)
  const pastSponsors = landingSponsors.filter((sponsor) => sponsor.isPast)

  const wall = (sponsors: typeof landingSponsors) => (
    <AvatarWall
      entries={sponsors.map((sponsor) => ({
        login: sponsor.login,
        avatarUrl: sponsor.avatarUrl,
        linkUrl: sponsor.linkUrl,
        title: sponsor.name,
      }))}
    />
  )

  return (
    <Section
      description={t('home.sponsors.description')}
      eyebrow={t('home.sponsors.eyebrow')}
      title={t('home.sponsors.title')}
    >
      {landingSponsors.length > 0 && (
        <div className="mb-8 grid gap-7">
          {currentSponsors.length > 0 && (
            <div>
              <h3 className="m-0 mb-3 text-center text-[13px] font-semibold text-body">
                {t('home.sponsors.current')}
              </h3>
              {wall(currentSponsors)}
            </div>
          )}
          {pastSponsors.length > 0 && (
            <div className="opacity-70">
              <h3 className="m-0 mb-3 text-center text-[13px] font-semibold text-muted">
                {t('home.sponsors.past')}
              </h3>
              {wall(pastSponsors)}
            </div>
          )}
        </div>
      )}

      <p className="m-0 text-center">
        <a
          className={cn(
            'inline-flex items-center gap-2 font-[650]',
            styles.outlinedAction
          )}
          href={SPONSOR_URL}
          rel="noreferrer"
          target="_blank"
        >
          <span aria-hidden className="text-[#d1425a] dark:text-[#ff8a99]">
            ♥
          </span>
          {t('home.sponsors.cta')}
        </a>
      </p>
    </Section>
  )
}
