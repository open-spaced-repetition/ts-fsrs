import { useI18n } from '@rspress/core/runtime'
import { Link } from '@rspress/core/theme-original'
import { cn } from '@/utils/cn'
import { FeatureCardMotion } from './FeatureCardMotion'
import * as styles from './styles'
import { useLocalePath } from './useLocalePath'

const PACKAGES = [
  {
    name: 'ts-fsrs',
    bodyKey: 'home.ecosystem.scheduler',
    href: 'https://www.npmjs.com/package/ts-fsrs',
  },
  {
    name: '@open-spaced-repetition/binding',
    bodyKey: 'home.ecosystem.binding',
    href: 'https://www.npmjs.com/package/@open-spaced-repetition/binding',
  },
] as const

export function FinalCta() {
  const t = useI18n<typeof import('i18n')>()
  const localePath = useLocalePath()

  return (
    <section className="rp-not-doc">
      <div className={styles.section}>
        <div className="landing-reveal">
          <h2 className={styles.heading}>{t('home.cta.title')}</h2>
          <p className={styles.lede}>{t('home.cta.description')}</p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              className={cn(
                'rounded-xl border border-transparent px-4 py-2 no-underline',
                'bg-linear-[135deg,var(--color-brand),#7d55db] text-white',
                'text-[13px] font-[680] shadow-primary'
              )}
              href={localePath('/guide/')}
            >
              {t('home.cta.primary')}
            </Link>
            <Link
              className={cn(styles.outlinedAction, 'font-[680]')}
              href={localePath('/playground')}
            >
              {t('home.cta.secondary')}
            </Link>
          </div>

          <div className="mt-11 grid gap-4 md:grid-cols-2">
            {PACKAGES.map(({ name, bodyKey, href }) => (
              <FeatureCardMotion className="h-full" key={name}>
                <a
                  className={cn(styles.card, 'block h-full no-underline')}
                  href={href}
                  rel="noreferrer"
                  target="_blank"
                >
                  <h3 className={cn(styles.cardTitle, 'font-mono')}>{name}</h3>
                  <p className={styles.cardBody}>{t(bodyKey)}</p>
                </a>
              </FeatureCardMotion>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
