import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { UserConfig } from '@rspress/core'
import { pluginTwoslash } from '@rspress/plugin-twoslash'
import {
  codeToHtml,
  createCssVariablesTheme,
  type ShikiTransformer,
} from 'shiki'

import type { LandingSnippetId } from './preview'

export type LandingSnippet = {
  readonly source: string
  readonly html: string
}

export type LandingSnippets = Record<LandingSnippetId, LandingSnippet>

const SNIPPET_DIR = 'src/snippets/landing'

export function readLandingSnippetFiles(
  docsRoot: string
): ReadonlyMap<string, string> {
  const dir = path.join(docsRoot, SNIPPET_DIR)
  return new Map(
    readdirSync(dir)
      .filter((file) => file.endsWith('.ts'))
      .sort()
      .map((file) => [path.basename(file, '.ts'), path.join(dir, file)])
  )
}

export type LandingTwoslashOptions = NonNullable<
  NonNullable<Parameters<typeof pluginTwoslash>[0]>['twoslashOptions']
>

const cssVariablesTheme = createCssVariablesTheme({
  name: 'css-variables',
  variablePrefix: '--shiki-',
  variableDefaults: {},
  fontStyle: true,
})

async function twoslashTransformer(
  twoslashOptions: LandingTwoslashOptions
): Promise<ShikiTransformer> {
  const borrowed: UserConfig = {}
  await pluginTwoslash({ twoslashOptions }).config?.(
    borrowed,
    { addPlugin: () => {}, removePlugin: () => {} },
    true
  )
  const transformer = borrowed.markdown?.shiki?.transformers?.at(-1)
  if (!transformer) {
    throw new Error('pluginTwoslash stopped registering a Shiki transformer')
  }
  return transformer as ShikiTransformer
}

export async function collectLandingSnippets(
  docsRoot: string,
  twoslashOptions: LandingTwoslashOptions
): Promise<LandingSnippets> {
  const twoslash = await twoslashTransformer(twoslashOptions)

  const entries = await Promise.all(
    [...readLandingSnippetFiles(docsRoot)].map(async ([id, file]) => {
      const source = readFileSync(file, 'utf8').trimEnd()
      const html = await codeToHtml(source, {
        lang: 'ts',
        theme: cssVariablesTheme,
        // Match the plugin's explicit ```ts twoslash trigger.
        meta: { __raw: 'twoslash' },
        transformers: [twoslash],
      })
      return [id, { source, html }] as const
    })
  )

  return Object.fromEntries(entries) as LandingSnippets
}
