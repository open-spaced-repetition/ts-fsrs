import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { collectLandingPreviews } from '../src/landing/preview'
import { readLandingSnippetFiles } from '../src/landing/snippets'
import { encodeSharedCode } from '../src/playground/shared/share-link'

const docsRoot = path.resolve(import.meta.dirname, '..')
const previews = collectLandingPreviews()

// The home page computes these rows in Node; the probe re-derives them in the
// browser, so a snippet that only runs outside one fails here instead.
const PROBE = `
console.log(
  JSON.stringify(
    [...outcomes].map(({ grade, card }) => [
      grade,
      card.dueAt.toISOString(),
      card.scheduleStatus,
    ])
  )
)`

for (const [id, file] of readLandingSnippetFiles(docsRoot)) {
  test(`landing snippet ${id} runs in the playground`, async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    const source = `${readFileSync(file, 'utf8').trimEnd()}\n${PROBE}`
    await page.goto(`/playground.html#code=${encodeSharedCode(source)}`)

    // A package the runner executes but the editor cannot type would pass on
    // output alone.
    await expect(page.locator('[data-editor-diagnostics]')).toHaveAttribute(
      'data-editor-diagnostics',
      '0'
    )

    const run = page.getByTestId('playground-run')
    await expect(run).toBeEnabled()
    await run.click()

    const output = page.getByTestId('playground-output')
    await expect(output).toHaveAttribute('data-state', /^(success|error)$/)
    expect(
      await output.getAttribute('data-state'),
      await output.innerText()
    ).toBe('success')

    // The probe writes the last line, after anything the snippet itself logs.
    const logged = (
      await page
        .getByTestId('worker-log')
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute('data-log-text'))
        )
    ).at(-1)
    expect(JSON.parse(logged ?? 'null')).toEqual(
      Object.entries(previews[id].grades).map(([grade, row]) => [
        Number(grade),
        row.dueAt,
        row.scheduleStatus,
      ])
    )

    expect(pageErrors).toEqual([])
  })
}
