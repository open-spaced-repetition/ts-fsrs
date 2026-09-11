import { useI18n } from '@rspress/core/runtime'
import { HomeFeature } from '@rspress/core/theme-original'
import { cn } from '@/utils/cn'
import { BranchConnector } from './BranchConnector'
import { FeatureCardMotion } from './FeatureCardMotion'
import { Section } from './Section'
import * as styles from './styles'

const LEVELS = [
  {
    step: '01',
    titleKey: 'home.entry.use.title',
    bodyKey: 'home.entry.use.body',
    api: ['DefaultScheduler'],
  },
  {
    step: '02',
    titleKey: 'home.entry.compose.title',
    bodyKey: 'home.entry.compose.body',
    api: ['defineScheduler', '.use(middleware)'],
  },
  {
    step: '03',
    titleKey: 'home.entry.extend.title',
    bodyKey: 'home.entry.extend.body',
    api: ['defineMiddleware', 'defineChrono'],
  },
] as const

export function EntryLevels() {
  const t = useI18n<typeof import('i18n')>()

  return (
    <Section
      description={t('home.entry.description')}
      eyebrow={t('home.entry.eyebrow')}
      title={t('home.entry.title')}
    >
      <div className="landing-entry-features">
        <HomeFeature
          features={LEVELS.map(({ step, titleKey, bodyKey, api }) => ({
            icon: step,
            title: t(titleKey),
            details: `${t(bodyKey)}<div class="mt-3 flex flex-wrap gap-1.5">${api
              .map(
                (name) =>
                  `<code class="rounded-full border border-line px-2.5 py-1 font-mono text-[11px] text-muted">${name}</code>`
              )
              .join('')}</div>`,
            span: 4,
          }))}
        />
      </div>

      <BranchConnector />

      <div className="mt-0 flex flex-col items-center">
        <div className="h-6 w-px bg-line-strong md:hidden" aria-hidden />
        <FeatureCardMotion radius="rounded-xl">
          <div
            className={cn(
              styles.node,
              'border-line-brand bg-brand-soft px-5 py-2.5'
            )}
          >
            <span className={styles.nodeTitle}>{t('home.entry.core')}</span>
          </div>
        </FeatureCardMotion>
      </div>
    </Section>
  )
}
