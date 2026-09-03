import bindingSource from '../examples/binding.ts?raw'
import tsFsrsSource from '../examples/ts-fsrs.ts?raw'

type ScenarioId = 'ts-fsrs' | 'binding' | 'custom'

export type PlaygroundScenario = {
  readonly code: string
  readonly id: ScenarioId
  readonly labelKey: `playground.scenario.${ScenarioId}`
}

export const PLAYGROUND_SCENARIOS: readonly PlaygroundScenario[] = [
  {
    id: 'ts-fsrs',
    labelKey: 'playground.scenario.ts-fsrs',
    code: tsFsrsSource,
  },
  {
    id: 'binding',
    labelKey: 'playground.scenario.binding',
    code: bindingSource,
  },
]

/**
 * Wraps shared code as its own tab. It joins the built-in examples instead of
 * overwriting one of them, so Reset restores the shared code and the examples
 * stay one click away.
 */
export function createCustomScenario(code: string): PlaygroundScenario {
  return { id: 'custom', labelKey: 'playground.scenario.custom', code }
}
