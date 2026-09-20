import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { expect, test } from '@playwright/test'
import ts from 'typescript'
import { sourceId } from '../src/playground/shared/source-id'

const docsRoot = path.resolve(import.meta.dirname, '..')
const buildRoot = path.join(docsRoot, 'doc_build')
const snippetsRoot = path.join(docsRoot, 'src/snippets')

function filesIn(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name)
    return entry.isDirectory() ? filesIn(file) : [file]
  })
}

// `cleanUrls` is on, so the site links to `/playground`, not to the
// `playground.html` file behind it. Visit what a reader would.
function routeFor(file: string): string {
  const relative = path.relative(buildRoot, file).split(path.sep).join('/')
  if (relative === 'index.html') return '/'
  if (relative.endsWith('/index.html'))
    return `/${relative.slice(0, -'index.html'.length)}`
  return `/${relative.slice(0, -'.html'.length)}`
}

if (!existsSync(buildRoot)) {
  throw new Error('Missing docs/doc_build. Run pnpm docs:build first.')
}

const runCodeRoutes = filesIn(buildRoot)
  .filter((file) => file.endsWith('.html'))
  .filter((file) => readFileSync(file, 'utf8').includes('run-code-test'))
  .map(routeFor)

const mathRoutes = filesIn(buildRoot)
  .filter((file) => file.endsWith('.md'))
  .filter((file) => readFileSync(file, 'utf8').includes('```math'))
  .map((file) => routeFor(file.replace(/\.md$/, '.html')))

if (mathRoutes.length === 0) {
  throw new Error('No formula pages found in docs build.')
}

const snippets = new Map<
  string,
  { readonly file: string; readonly outputFile: string }
>()
for (const file of filesIn(snippetsRoot)) {
  if (!file.endsWith('.ts') || file.endsWith('.output.ts')) continue
  const id = sourceId(readFileSync(file, 'utf8'))
  const duplicate = snippets.get(id)
  if (duplicate) {
    throw new Error(
      `Duplicate RunCode source id ${id}: ${path.relative(docsRoot, duplicate.file)} and ${path.relative(docsRoot, file)}`
    )
  }
  snippets.set(id, {
    file,
    outputFile: file.replace(/\.ts$/, '.output.ts'),
  })
}

async function expectedOutput(file: string): Promise<readonly string[]> {
  const javascript = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: file,
  }).outputText
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}#${encodeURIComponent(pathToFileURL(file).href)}`
  const value: unknown = (await import(moduleUrl)).default
  const lines = typeof value === 'string' ? [value] : value
  if (!Array.isArray(lines) || !lines.every((line) => typeof line === 'string'))
    throw new Error(`${file} must default-export a string or string array.`)
  return lines
}

for (const route of runCodeRoutes) {
  test(`RunCode succeeds on ${route}`, async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await page.goto(route)
    const runners = page.getByTestId('run-code-test')
    const count = await runners.count()
    expect(count).toBeGreaterThan(0)

    for (let index = 0; index < count; index += 1) {
      const runner = runners.nth(index)
      const id = await runner.getAttribute('data-run-code-source')
      const snippet = id ? snippets.get(id) : undefined
      expect(snippet, `Unknown RunCode source id: ${id}`).toBeDefined()

      if (snippet) {
        const displayedSource = await runner
          .locator('xpath=preceding-sibling::*[1]//code')
          .first()
          .innerText()
        expect(displayedSource?.trimEnd()).toBe(
          readFileSync(snippet.file, 'utf8').trimEnd()
        )
      }

      await runner.getByTestId('run-code-button').click()
      await expect(runner).toHaveAttribute(
        'data-run-code-status',
        /^(success|error)$/
      )
      const status = await runner.getAttribute('data-run-code-status')
      const output = runner.getByTestId('run-code-output')
      const message = (await output.count()) > 0 ? await output.innerText() : ''
      expect(status, message).toBe('success')

      if (snippet && existsSync(snippet.outputFile)) {
        const actual = await runner
          .getByTestId('worker-log')
          .evaluateAll((elements) =>
            elements.map((element) => element.getAttribute('data-log-text'))
          )
        expect(actual).toEqual(await expectedOutput(snippet.outputFile))
      }
    }

    expect(pageErrors).toEqual([])
  })
}

for (const route of [
  '/guide/state-transitions',
  '/ja-JP/guide/state-transitions',
  '/zh-CN/guide/state-transitions',
  '/zh-TW/guide/state-transitions',
]) {
  test(`State transition diagram loads on ${route}`, async ({ page }) => {
    await page.goto(route)
    const diagram = page.locator('img[src*="state-transitions"]')
    await expect(diagram).toBeVisible()
    expect(
      await diagram.evaluate(
        (image: HTMLImageElement) => image.complete && image.naturalWidth > 0
      )
    ).toBe(true)
  })
}

for (const route of mathRoutes) {
  test(`Model formulas render on ${route}`, async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await page.goto(route)
    expect(await page.locator('math[display="block"]').count()).toBeGreaterThan(
      0
    )
    expect(
      await page.locator('math:not([display="block"])').count()
    ).toBeGreaterThan(0)
    const mathScroll = page
      .locator(
        '.rp-codeblock:has(math[display="block"]) .rp-codeblock__content__scroll-container'
      )
      .first()
    await expect(mathScroll).toHaveCSS('scrollbar-width', 'none')
    await expect(mathScroll).toHaveCSS('padding-top', '8px')
    await expect(
      page
        .locator(
          '.rp-codeblock:has(math[display="block"]) .rp-code-button-group'
        )
        .first()
    ).toBeHidden()
    expect(pageErrors).toEqual([])
  })
}

test('Playground runs its default example', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto('/playground')
  const run = page.getByTestId('playground-run')
  await expect(run).toBeEnabled()
  await run.click()

  await expect(run).toBeDisabled()
  await expect(run).toBeEnabled()

  const output = page.getByTestId('playground-output')
  await expect(output).toHaveAttribute('data-state', /^(success|error)$/)
  expect(
    await output.getAttribute('data-state'),
    await output.innerText()
  ).toBe('success')
  expect(pageErrors).toEqual([])
})
