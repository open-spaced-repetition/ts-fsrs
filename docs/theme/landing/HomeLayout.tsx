import {
  HomeLayout as OriginalHomeLayout,
  PackageManagerTabs,
} from '@rspress/core/theme-original'
import { LandingSections } from './LandingSections'

export function HomeLayout() {
  return (
    <OriginalHomeLayout
      afterFeatures={<LandingSections />}
      afterHeroActions={
        // PackageManagerTabs expects Rspress document typography.
        <div className="rp-doc -my-4 w-full max-w-[27rem]">
          <PackageManagerTabs command="install ts-fsrs" />
        </div>
      }
    />
  )
}
