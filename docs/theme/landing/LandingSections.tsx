import { ArchitectureMap } from './ArchitectureMap'
import { Contributors } from './Contributors'
import { EntryLevels } from './EntryLevels'
import { FinalCta } from './FinalCta'
import { MiddlewareVisual } from './MiddlewareVisual'
import { PerformanceBento } from './PerformanceBento'
import { SchemaContract } from './SchemaContract'
import { Sponsors } from './Sponsors'

export function LandingSections() {
  return (
    <>
      <EntryLevels />
      <SchemaContract />
      <MiddlewareVisual />
      <ArchitectureMap />
      <PerformanceBento />
      <Contributors />
      <Sponsors />
      <FinalCta />
    </>
  )
}
