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
        <div className="rp-doc -mt-4 mb-4 w-full max-w-108 min-[1001px]:-mb-4">
          <PackageManagerTabs command="install ts-fsrs" />
        </div>
      }
    />
  )
}
