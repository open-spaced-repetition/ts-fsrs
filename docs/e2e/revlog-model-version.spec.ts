import { expect, test } from '@playwright/test'

test.use({ timezoneId: 'UTC' })

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
    expect(JSON.parse(await result.locator('pre').innerText())).toHaveLength(
      modelVersion === 'FSRS-6' ? 21 : 34
    )
    expect(errors).toEqual([])
  })
}
