import { expect, test, type Page } from '@playwright/test'
const base = process.env.BR_E2E_BASE_URL ?? 'http://127.0.0.1:5205'

async function login(page: Page, email: string) {
  await page.goto(base + '/login')
  const pending = page.waitForEvent('popup', { timeout: 20000 })
  await page
    .getByRole('button', { name: 'Continue with Google', exact: true })
    .click()
  const popup = await pending
  await popup.getByText('Sign-in with Google.com').waitFor()
  const existing = popup.getByText(email, { exact: false })
  if (await existing.count()) await existing.first().click()
  else {
    await popup.getByText('Add new account').click()
    await popup.locator('#email-input').fill(email)
    await popup.locator('#display-name-input').fill('Coffee Shop Owner')
    await popup
      .getByRole('button', { name: 'Sign in with Google.com', exact: true })
      .click()
  }
  await expect(
    page.getByRole('heading', { name: 'Home', exact: true }),
  ).toBeVisible()
}
async function nav(page: Page, name: string) {
  const link = page
    .getByRole('navigation')
    .getByRole('link', { name, exact: true })
  if (!(await link.isVisible()))
    await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  await link.click()
}
async function generate(page: Page) {
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/v1/simulations') &&
      r.request().method() === 'POST',
  )
  await page
    .getByRole('button', { name: 'Generate AI Drying Plan', exact: true })
    .click()
  const result = await response
  expect(result.status()).toBe(200)
  const payload = await result.json()
  await expect(
    page.getByRole('heading', { name: 'Your AI Drying Plan', exact: true }),
  ).toBeVisible()
  return { payload, request: result.request().postDataJSON() }
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
}

// Real FastAPI responses and Firebase emulator writes; no fabricated physics.
test('shop owner creates a plan, compares 42 to 35, restores history and isolates accounts', async ({
  page,
  browser,
}) => {
  test.setTimeout(120000)
  await page.setViewportSize({ width: 1440, height: 1000 })
  const email = `phase06-${Date.now()}@example.test`
  await login(page, email)
  await expect(page.getByRole('navigation').getByRole('link')).toHaveText([
    'Home',
    'My Shop',
    'Drying History',
    'Settings',
  ])
  await page.evaluate(() => {
    ;(document.activeElement as HTMLElement)?.blur()
    window.scrollTo(0, 0)
  })
  await page.screenshot({
    path: '../docs/screenshots/phase-06-home-desktop.png',
    fullPage: true,
  })
  await nav(page, 'My Shop')
  await page.getByLabel('Shop name', { exact: true }).fill('Morning Coffee')
  await page.getByLabel('Location', { exact: true }).fill('Bangkok')
  await page.getByLabel('AC model / name').fill('Main shop AC')
  await page.getByLabel('Rated cooling capacity').fill('5')
  await page.getByRole('button', { name: 'Save now', exact: true }).click()
  await expect(
    page.getByText('Shop information saved.', { exact: true }),
  ).toBeVisible()
  await page.getByLabel('AC heat temperature').fill('42')
  await page.getByLabel('Available heat', { exact: false }).fill('2')
  await page.getByRole('button', { name: 'Save heat estimates' }).click()
  await expect(
    page.getByText('Heat estimates saved.', { exact: false }),
  ).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Shop name', { exact: true })).toHaveValue(
    'Morning Coffee',
  )
  await nav(page, 'Home')
  await expect(page.locator('.home-shortcuts')).toContainText('Morning Coffee')
  await page
    .getByRole('link', { name: 'Create a Drying Batch', exact: true })
    .click()
  let simulationRequests = 0
  page.on('request', (request) => {
    if (
      request.url().endsWith('/api/v1/simulations') &&
      request.method() === 'POST'
    )
      simulationRequests++
  })
  await page.getByLabel('Target moisture', { exact: false }).fill('70')
  await page.getByRole('button', { name: 'Generate AI Drying Plan' }).click()
  await expect(
    page.getByText('Target moisture must be lower than initial moisture.'),
  ).toBeVisible()
  expect(simulationRequests).toBe(0)
  await page.getByLabel('Target moisture', { exact: false }).fill('25')
  await page.evaluate(() => {
    ;(document.activeElement as HTMLElement)?.blur()
    window.scrollTo(0, 0)
  })
  await page.screenshot({
    path: '../docs/screenshots/phase-06-batch-desktop.png',
    fullPage: true,
  })
  const original = await generate(page)
  expect(original.request.profile.samples).toEqual(
    [0, 480].map((minute) => ({
      minute,
      temperature_c: 42,
      available_heat_kw: 2,
      relative_humidity: 0.55,
    })),
  )
  const keyResults = page.locator('.drying-results > section').nth(1)
  const originalText = await keyResults.innerText()
  await expect(keyResults).toContainText(
    String(original.payload.final_moisture_percent_wb),
  )
  await expect(keyResults).toContainText(
    String(original.payload.duration_minutes),
  )
  await expect(keyResults).toContainText(
    String(original.payload.water_removed_kg),
  )
  await expect(
    page.getByText('Gemini recommendations unavailable', { exact: true }),
  ).toBeVisible()
  await expect(page.locator('.drying-results > section h2')).toHaveText([
    'AI Assessment',
    'Key Results',
    'AI Recommendations',
    'Moisture Prediction Chart',
    'What if your AC produces less heat?',
  ])
  await expect(page.locator('.calculation-details')).not.toHaveAttribute(
    'open',
    '',
  )
  const requestsBeforeSlider = simulationRequests
  await page.getByRole('slider').fill('35')
  await expect(page.getByText('Before vs. After', { exact: true })).toHaveCount(
    0,
  )
  expect(simulationRequests).toBe(requestsBeforeSlider)
  const adjustedResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/v1/simulations') &&
      r.request().method() === 'POST',
  )
  const replanResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/v1/plans/replan') &&
      r.request().method() === 'POST',
  )
  await page
    .getByRole('button', { name: 'Run What-If Simulation', exact: true })
    .click()
  const response = await adjustedResponse
  const adjusted = await response.json()
  const updatedPlanResponse = await replanResponse
  expect(updatedPlanResponse.status()).toBe(200)
  const updatedPlan = await updatedPlanResponse.json()
  const replanInput = updatedPlanResponse.request().postDataJSON()
  expect(replanInput.changed_temperature_c).toBe(35)
  expect(replanInput.elapsed_minutes).toBe(0)
  expect(replanInput.profile).toEqual(original.request.profile)
  const modifiedRequest = response.request().postDataJSON()
  expect(modifiedRequest.batch).toEqual(original.request.batch)
  expect(modifiedRequest.constraints).toEqual(original.request.constraints)
  expect(modifiedRequest.profile.samples).toEqual(
    original.request.profile.samples.map((sample: object) => ({
      ...sample,
      temperature_c: 35,
    })),
  )
  expect(simulationRequests).toBe(requestsBeforeSlider + 1)
  await expect(page.getByTestId('before-moisture')).toHaveText(
    original.payload.final_moisture_percent_wb + '% wet basis',
  )
  await expect(page.getByTestId('after-moisture')).toHaveText(
    adjusted.final_moisture_percent_wb + '% wet basis',
  )
  await expect(page.getByTestId('before-duration')).toHaveText(
    original.payload.duration_minutes + ' minutes',
  )
  await expect(page.getByTestId('after-duration')).toHaveText(
    adjusted.duration_minutes + ' minutes',
  )
  expect(await keyResults.innerText()).toBe(originalText)
  expect(adjusted.final_moisture_percent_wb).not.toBe(
    original.payload.final_moisture_percent_wb,
  )
  await noOverflow(page)
  await page.evaluate(() => {
    ;(document.activeElement as HTMLElement)?.blur()
    window.scrollTo(0, 0)
  })
  await page.screenshot({
    path: '../docs/screenshots/phase-06-plan-desktop.png',
    fullPage: true,
  })
  await page.getByText('View Calculation Details', { exact: true }).click()
  await expect(
    page.getByText('Estimated Thermal Energy', { exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Compare drying methods' }).click()
  await expect(
    page.getByRole('table', { name: 'Same batch, source, and model' }),
  ).toBeVisible()
  await expect(
    page.getByText('Calculation history saved', { exact: true }),
  ).toBeVisible()
  await nav(page, 'Drying History')
  await page.getByLabel('Record type').selectOption('replanning_runs')
  await expect(page.locator('.drying-history-list li')).toHaveCount(1)
  await page.locator('.drying-history-list li button').first().click()
  await expect(page.locator('.saved-plan-summary')).toContainText(
    String(updatedPlan.plan.predicted.final_moisture_percent_wb),
  )
  await page.getByLabel('Record type').selectOption('ai_plans')
  await expect(page.locator('.drying-history-list li')).toHaveCount(2)
  await page.locator('.drying-history-list li button').nth(1).click()
  await expect(page.locator('.saved-plan-summary')).toContainText(
    String(original.payload.final_moisture_percent_wb),
  )
  await page.getByText('View saved calculation record', { exact: true }).click()
  await expect(page.locator('article')).toContainText('thin-layer-1.0')
  await page
    .getByRole('button', { name: 'Use these inputs for a new batch' })
    .click()
  await expect(page.getByLabel('AC heat temperature')).toHaveValue('42')
  await nav(page, 'Drying History')
  await page.getByLabel('Record type').selectOption('simulations')
  await expect(page.locator('.drying-history-list li')).toHaveCount(2)
  await page.getByRole('button', { name: 'Open account menu' }).click()
  await page.getByRole('button', { name: 'Log out', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Continue with Google', exact: true }),
  ).toBeVisible()
  await login(page, email)
  await page.getByRole('link', { name: 'Open latest plan' }).click()
  await expect(
    page.getByRole('heading', { name: 'Saved AI drying plans', exact: true }),
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Saved AI drying plans', exact: true }),
  ).toBeVisible()
  const other = await browser.newContext()
  const second = await other.newPage()
  await login(second, `phase06-other-${Date.now()}@example.test`)
  await nav(second, 'Drying History')
  await expect(second.getByText('No saved records yet.')).toBeVisible()
  await other.close()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Delete record', exact: true }).click()
  await expect(page.locator('.drying-history-list li')).toHaveCount(1)
})

for (const width of [1440, 390])
  test(`four destinations and legacy bookmarks render at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(120000)
    await page.setViewportSize({ width, height: 900 })
    await login(page, `phase06-layout-${width}-${Date.now()}@example.test`)
    for (const path of ['/', '/shop', '/history', '/settings', '/drying/new']) {
      await page.goto(base + path)
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('nav a')).toHaveCount(4)
      await noOverflow(page)
    }
    for (const path of [
      '/site',
      '/batch',
      '/thermal-profile',
      '/simulation',
      '/ai-planning',
      '/replanning',
      '/benchmark',
    ]) {
      await page.goto(base + path)
      await expect(page.locator('h1')).toHaveText(
        path === '/site' ? 'My Shop' : 'Create a Drying Batch',
      )
    }
    if (width === 390) {
      await page.evaluate(() => {
        ;(document.activeElement as HTMLElement)?.blur()
        window.scrollTo(0, 0)
      })
      await page.screenshot({
        path: '../docs/screenshots/phase-06-batch-mobile.png',
        fullPage: true,
      })
      await generate(page)
      await page.getByRole('slider').fill('35')
      await page
        .getByRole('button', { name: 'Run What-If Simulation', exact: true })
        .click()
      await expect(page.getByTestId('after-moisture')).toBeVisible()
      await noOverflow(page)
      await page.evaluate(() => {
        ;(document.activeElement as HTMLElement)?.blur()
        window.scrollTo(0, 0)
      })
      await page.screenshot({
        path: '../docs/screenshots/phase-06-plan-mobile.png',
        fullPage: true,
      })
      await page.getByRole('button', { name: 'Open menu', exact: true }).click()
      await expect(
        page
          .getByRole('navigation')
          .getByRole('link', { name: 'Home', exact: true }),
      ).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(
        page.getByRole('button', { name: 'Open menu', exact: true }),
      ).toBeFocused()
    }
  })

test('unauthenticated deep links redirect to login', async ({ page }) => {
  await page.goto(base + '/history')
  await expect(page).toHaveURL(/login/)
  await expect(
    page.getByRole('button', { name: 'Continue with Google', exact: true }),
  ).toBeVisible()
})

test('what-if failures retry real calculations and keep the saved baseline at 42 degrees', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.setViewportSize({ width: 390, height: 900 })
  await login(page, `phase06-retry-${Date.now()}@example.test`)
  await page
    .getByRole('link', { name: 'Create a Drying Batch', exact: true })
    .click()
  const original = await generate(page)
  await page.getByRole('slider').fill('35')
  await page.route('**/api/v1/simulations', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: '{"detail":"Temporary test failure"}',
    }),
  )
  await page
    .getByRole('button', { name: 'Run What-If Simulation', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText(
    'What-if simulation could not finish',
  )
  await expect(page.getByText('Before vs. After', { exact: true })).toHaveCount(
    0,
  )
  await expect(page.locator('.drying-key-results').first()).toContainText(
    String(original.payload.final_moisture_percent_wb),
  )
  await page.unroute('**/api/v1/simulations')
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/v1/simulations') &&
      r.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Retry What-If Simulation' }).click()
  const actual = await (await response).json()
  await expect(page.getByTestId('after-moisture')).toHaveText(
    actual.final_moisture_percent_wb + '% wet basis',
  )
  await expect(page.getByTestId('before-moisture')).toHaveText(
    original.payload.final_moisture_percent_wb + '% wet basis',
  )
  await page.reload()
  await expect(page.getByLabel('AC heat temperature')).toHaveValue('42')
  await expect(
    page.getByRole('heading', { name: 'Create a Drying Batch', exact: true }),
  ).toBeVisible()
})
