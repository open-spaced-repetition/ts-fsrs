import { expect, test } from '@playwright/test'

test('copies full playground output and handles clipboard failure', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/playground')
  const copy = page.getByTestId('copy-output')
  await expect(copy).toBeDisabled()
  await expect(page.getByTestId('playground-run')).toBeEnabled()
  await expect(page.locator('[data-editor-diagnostics]')).toHaveAttribute(
    'data-editor-diagnostics',
    '0'
  )
  await page
    .getByRole('textbox', { name: /Editor content/ })
    .press('ControlOrMeta+a')
  let releaseRun!: () => void
  const runGate = new Promise<void>((resolve) => {
    releaseRun = resolve
  })
  await context.route('**/copy-output-release', async (route) => {
    await runGate
    await route.fulfill({ body: 'ok' })
  })
  await page.keyboard.insertText(
    'console.log({ nested: { value: "copy test" } }); await fetch("/copy-output-release"); console.warn("warning"); throw new Error("failure")'
  )
  await page.getByTestId('playground-run').click()
  await expect(page.getByTestId('worker-log')).toHaveCount(1)
  await expect(page.getByTestId('playground-run')).toBeDisabled()
  await expect(copy).toBeDisabled()
  releaseRun()
  await expect(page.getByTestId('playground-output')).toHaveAttribute(
    'data-state',
    'error'
  )
  const logs = await page
    .getByTestId('worker-log')
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('data-log-text'))
    )
  const error = await page
    .getByTestId('playground-output')
    .locator(':scope > pre')
    .innerText()
  await copy.click()
  await expect(copy).toHaveAttribute('data-status', 'copied')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    [...logs, error].join('\n')
  )
  await expect(copy).toHaveAttribute('data-status', 'idle')
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => {
      throw new Error('Denied')
    }
  })
  await copy.click()
  await expect(copy).toHaveAttribute('data-status', 'failed')
})

test('RunCode copies every output line', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/guide/architecture')
  const runner = page.getByTestId('run-code-test').first()
  await runner.getByTestId('run-code-button').click()
  await expect(runner).toHaveAttribute('data-run-code-status', 'success')
  const logs = await runner
    .getByTestId('worker-log')
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('data-log-text'))
    )
  await runner.getByTestId('copy-output').click()
  await expect(runner.getByTestId('copy-output')).toHaveAttribute(
    'data-status',
    'copied'
  )
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    logs.join('\n')
  )
})
