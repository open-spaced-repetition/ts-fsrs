import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { prepareExampleSource } from '../src/playground/shared/example-source'

test.use({ timezoneId: 'UTC' })

test('training switches follow the selected model', async ({ page }) => {
  const code = Buffer.from(
    prepareExampleSource(
      readFileSync(
        new URL('../src/playground/examples/binding.ts', import.meta.url),
        'utf8'
      ),
      '/'
    )
  ).toString('base64url')
  await page.goto(`/playground#code=${code}`)
  await expect(page.getByTestId('playground-run')).toBeEnabled()
  await expect(page.locator('[data-editor-diagnostics]')).toHaveAttribute(
    'data-editor-diagnostics',
    '0'
  )
  const model = page.getByTestId('revlog-model-version')
  const shortTerm = page.getByTestId('revlog-enable-short-term')
  const penalties = page.getByTestId('revlog-enable-sched-penalties')
  await expect(model).toHaveValue('FSRS-7')
  await expect(shortTerm).toHaveCount(0)
  await expect(penalties).not.toBeChecked()
  await penalties.check()
  await model.selectOption('FSRS-6')
  await expect(penalties).toHaveCount(0)
  await expect(shortTerm).toBeChecked()
  await shortTerm.uncheck()
  await model.selectOption('FSRS-7')
  await expect(penalties).toBeChecked()
  await expect(shortTerm).toHaveCount(0)
  await model.selectOption('FSRS-6')
  await expect(shortTerm).not.toBeChecked()
})

for (const modelVersion of ['FSRS-6', 'FSRS-7'] as const) {
  test(`RevlogTrainer trains ${modelVersion} in its WASI Worker`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/playground')
    const model = page.getByTestId('revlog-model-version')
    await expect(model).toHaveValue('FSRS-7')
    await model.selectOption(String(modelVersion))
    if (modelVersion === 'FSRS-7') {
      await page.getByTestId('revlog-enable-sched-penalties').check()
    }
    const timezone = page.getByTestId('revlog-timezone')
    await timezone.fill('UTC')
    await page.getByRole('option', { name: 'UTC', exact: true }).click()
    await expect(timezone).toHaveValue('UTC')
    await expect(timezone).toHaveAttribute('aria-expanded', 'false')
    await page.getByTestId('revlog-next-day-start').selectOption('0')
    const rows = [
      'review_time,card_id,review_rating,review_duration,review_state',
    ]
    for (let card = 0; card < 96; card++) {
      for (let review = 0; review < 4; review++) {
        const rating =
          review === 0 ? (card % 4) + 1 : card % (review + 4) === 0 ? 1 : 3
        const elapsedDays =
          modelVersion === 'FSRS-7' && review === 1 ? 1 / 24 : review
        rows.push(
          `${1704067200000 + elapsedDays * 86400000},card-${card},${rating},1000,${review === 0 ? 0 : 2}`
        )
      }
    }
    await page.getByTestId('revlog-file').setInputFiles({
      name: 'model-version.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(rows.join('\n')),
    })
    await page.getByTestId('revlog-train').click()
    const result = page.getByTestId('revlog-result')
    await expect(result.or(page.getByTestId('revlog-error'))).toBeVisible()
    await expect(page.getByTestId('revlog-error')).toHaveCount(0)
    await expect(result).toContainText('288')
    const weights = JSON.parse(await result.locator('pre').innerText())
    expect(weights).toHaveLength(modelVersion === 'FSRS-6' ? 21 : 34)
    if (modelVersion === 'FSRS-7') {
      await page.getByTestId('revlog-enable-sched-penalties').uncheck()
      await page.getByTestId('revlog-train').click()
      await expect(result.or(page.getByTestId('revlog-error'))).toBeVisible()
      await expect(page.getByTestId('revlog-error')).toHaveCount(0)
      expect(JSON.parse(await result.locator('pre').innerText())).not.toEqual(
        weights
      )
    }
    expect(errors).toEqual([])
  })
}
