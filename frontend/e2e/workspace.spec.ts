import { expect, test } from '@playwright/test'
const paths = [
  '/',
  '/site',
  '/batch',
  '/thermal-profile',
  '/simulation',
  '/ai-planning',
  '/replanning',
  '/benchmark',
]
for (const width of [1440, 390]) {
  test(
    'all pages render without overflow at ' + width + 'px',
    async ({ page }) => {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 })
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      for (const path of paths) {
        await page.goto(path)
        await expect(page.locator('h1')).toBeVisible()
        await expect(page.locator('.provenance-bar')).toContainText(
          'SYNTHETIC / UI PREVIEW',
        )
        if (['/', '/thermal-profile', '/simulation'].includes(path))
          await expect(page.locator('.recharts-area')).toBeVisible()
        if (path === '/ai-planning') {
          await page
            .getByLabel('Preview a response state')
            .selectOption('NO_FEASIBLE_PLAN')
          await expect(
            page.getByText('NO_FEASIBLE_PLAN', { exact: true }).last(),
          ).toBeVisible()
        }
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        )
        expect(overflow, 'Page overflow: ' + path).toBe(false)
        if (path === '/')
          await page.screenshot({
            path:
              '../docs/phase-02-' +
              (width === 1440 ? 'desktop' : 'mobile') +
              '.png',
            fullPage: true,
          })
        if (path === '/site' && width === 390)
          await page.screenshot({
            path: '../docs/phase-02-mobile-form.png',
            fullPage: true,
          })
      }
      expect(errors).toEqual([])
    },
  )
}
test('mobile menu navigates and restores keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const open = page.getByRole('button', { name: 'Open menu' })
  await open.click()
  await expect(page.getByRole('button', { name: 'Close menu' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(open).toBeFocused()
  await open.click()
  await page.getByRole('link', { name: 'Batch setup', exact: true }).click()
  await expect(page.locator('h1')).toHaveText('Batch setup')
  await expect(open).toHaveAttribute('aria-expanded', 'false')
  await page.getByRole('button', { name: 'Review draft' }).click()
  await expect(page.getByText('This value is required.')).toHaveCount(4)
})
test('replanning is explicit and never claims a computed plan', async ({
  page,
}) => {
  await page.goto('/replanning')
  await page.getByRole('slider').fill('50')
  await expect(page.getByText('Awaiting request')).toBeVisible()
  await page.getByRole('button', { name: 'Replan', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Requesting…' })).toBeDisabled()
  await expect(page.getByText('MODEL_NOT_CONNECTED')).toBeVisible()
  await expect(
    page.getByText('Preview reviewed for 50 °C.', { exact: false }),
  ).toBeVisible()
})
test('production never falls back to synthetic charts', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  await page.goto('http://127.0.0.1:4173')
  await expect(page.locator('.provenance-bar')).toContainText(
    'BACKEND DISCONNECTED',
  )
  await expect(page.locator('.recharts-area')).toHaveCount(0)
  await expect(page.getByRole('alert')).toContainText(
    'No thermal-profile endpoint is configured',
  )
  await page.goto('http://127.0.0.1:4173/replanning')
  await page.getByRole('button', { name: 'Replan', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Backend disconnected')
  expect(requests.some((url) => url.includes('FixturePreviewRepository'))).toBe(
    false,
  )
  await page.screenshot({
    path: '../docs/phase-02-production.png',
    fullPage: true,
  })
})
