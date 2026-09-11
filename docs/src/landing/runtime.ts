import type { LandingContributor, LandingSponsor } from './community'
import type { LandingPreviews } from './preview-data'
import type { LandingSnippets } from './snippets'

// Keep Node-only producers out of the browser bundle.
declare const __LANDING_SNIPPETS__: LandingSnippets
declare const __LANDING_PREVIEWS__: LandingPreviews
declare const __LANDING_SPONSORS__: readonly LandingSponsor[]
declare const __LANDING_CONTRIBUTORS__: readonly LandingContributor[]

export const landingSnippets = __LANDING_SNIPPETS__
export const landingPreviews = __LANDING_PREVIEWS__
export const landingSponsors = __LANDING_SPONSORS__
export const landingContributors = __LANDING_CONTRIBUTORS__
