import { useI18n } from '@rspress/core/runtime'
import { landingSponsors } from '@/landing/runtime'
import { cn } from '@/utils/cn'
import { AvatarWall } from './AvatarWall'
import { Section } from './Section'

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
            'inline-flex items-center gap-2 rounded-xl border border-line',
            'bg-surface px-4 py-2 text-[13px] font-[650] text-body no-underline',
            'transition-colors duration-200 hover:border-line-strong',
            'motion-reduce:transition-none'
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
