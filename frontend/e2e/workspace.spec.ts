import { expect, test, type Page } from '@playwright/test'
const base = 'http://127.0.0.1:5205'
async function login(page: Page, email: string) {
  await page.goto(base + '/login')
  const pending = page.waitForEvent('popup')
  await page
    .getByRole('button', { name: 'Continue with Google', exact: true })
    .click()
  const popup = await pending
  const existing = popup.getByText(email, { exact: false })
  await popup.getByText('Sign-in with Google.com').waitFor()
  if (await existing.count()) await existing.first().click()
  else {
    await popup.getByText('Add new account').click()
    await popup.locator('#email-input').fill(email)
    await popup.locator('#display-name-input').fill('Phase05 Tester')
    await popup
      .getByRole('button', { name: 'Sign in with Google.com', exact: true })
      .click()
  }
  await expect(
    page.getByRole('heading', { name: /AI Thermal Engineer/ }),
  ).toBeVisible()
}
async function nav(page: Page, path: string) {
  await page.locator(`nav a[href="${path}"]`).click()
}
test('private workspace restores, records all computations, isolates users and supports history actions', async ({
  page,
  browser,
}) => {
  test.setTimeout(120000)
  const email = `phase05-${Date.now()}@example.test`
  await login(page, email)
  await nav(page, '/site')
  await page.getByLabel('Scenario source temperature').fill('42')
  await page.getByLabel('Recoverable heat').fill('2')
  await page.locator('form').first().getByRole('button').click()
  await expect(
    page.getByText('Source saved for signed-in users', { exact: false }),
  ).toBeVisible()
  await page.getByLabel('Site name', { exact: true }).fill('Saved Roastery')
  await page.getByLabel('Location', { exact: true }).fill('Bangkok')
  await page.getByLabel('AC model / asset ID').fill('AC-1')
  await page.getByLabel('Rated cooling capacity').fill('5')
  await page.getByRole('button', { name: 'Save now' }).click()
  await expect(
    page.getByText('Site saved to your private workspace.'),
  ).toBeVisible()
  await nav(page, '/batch')
  await page.getByLabel('Mass after pressing').fill('10')
  await page.getByRole('button', { name: 'Review draft' }).click()
  await expect(
    page.getByText('Engine returned the water duty.', { exact: false }),
  ).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Mass after pressing')).toHaveValue('10')
  await nav(page, '/site')
  await expect(page.getByLabel('Site name', { exact: true })).toHaveValue(
    'Saved Roastery',
  )
  await nav(page, '/thermal-profile')
  await expect(
    page.getByRole('heading', { name: 'Thermal profile', exact: true }),
  ).toBeVisible()
  for (const path of ['/simulation', '/ai-planning', '/benchmark']) {
    await nav(page, path)
    await expect(
      page.getByText('Calculation history saved', { exact: true }),
    ).toBeVisible()
  }
  await nav(page, '/replanning')
  await page.getByRole('slider').fill('35')
  await page.getByRole('button', { name: 'Replan', exact: true }).click()
  await expect(
    page.getByText('Replanned for 35', { exact: false }),
  ).toBeVisible()
  await nav(page, '/history')
  for (const kind of [
    'simulations',
    'ai_plans',
    'replanning_runs',
    'benchmarks',
  ]) {
    await page.getByLabel('Record type').selectOption(kind)
    await page.locator('li button').first().click()
    await expect(
      page.getByRole('heading', { name: 'Original input parameters' }),
    ).toBeVisible()
    await expect(page.locator('article')).toContainText('thin-layer-1.0')
  }
  await page.getByLabel('Record type').selectOption('simulations')
  await page.locator('li button').first().click()
  await page.getByRole('button', { name: 'Duplicate scenario' }).click()
  await expect(page.getByLabel('Mass after pressing')).toHaveValue('10')
  await page.getByRole('button', { name: 'Open account menu' }).click()
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(
    page.getByRole('button', { name: 'Continue with Google', exact: true }),
  ).toBeVisible()
  await login(page, email)
  await nav(page, '/history')
  await expect(page.locator('li button').first()).toBeVisible()
  const other = await browser.newContext()
  const second = await other.newPage()
  await login(second, `other-${Date.now()}@example.test`)
  await nav(second, '/history')
  await expect(second.getByText('No saved records yet.')).toBeVisible()
  await other.close()
  await page.locator('li button').first().click()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Delete record', exact: true }).click()
  await expect(page.getByText('No saved records yet.')).toBeVisible()
})
for (const width of [1440, 390])
  test(`eight protected pages render at ${width}px`, async ({ page }) => {
    test.setTimeout(90000)
    await page.setViewportSize({ width, height: 900 })
    await login(page, `layout-${width}-${Date.now()}@example.test`)
    for (const path of [
      '/',
      '/site',
      '/batch',
      '/thermal-profile',
      '/simulation',
      '/ai-planning',
      '/replanning',
      '/benchmark',
    ]) {
      await page.goto(base + path)
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('.provenance-bar')).toBeVisible()
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true)
    }
  })
test('unauthenticated deep links redirect to login', async ({ page }) => {
  await page.goto(base + '/history')
  await expect(page).toHaveURL(/login/)
  await expect(
    page.getByRole('button', { name: 'Continue with Google', exact: true }),
  ).toBeVisible()
})
