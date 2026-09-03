import { Layout as OriginalLayout } from '@rspress/core/theme-original'
import './index.css'

export * from '@rspress/core/theme-original'

export { HomeHero } from './landing/HomeHero'
export { HomeLayout } from './landing/HomeLayout'

export function Layout() {
  return <OriginalLayout />
}
