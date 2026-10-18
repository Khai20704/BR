/* global document, scrollTo, innerWidth */
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { chromium } from '@playwright/test'
import { buildScenarioBody, DOCUMENTED_DRAFT } from '../src/core/scenario/scenario-draft.ts'

const site = 'https://breake-the-rules.web.app'
const api = 'https://br-api-916064977717.asia-southeast1.run.app'
const reportPath = '../docs/phase-06-live-verification.json'
const report = { startedAt: new Date().toISOString(), site, api, checks: {}, criticalError: null }
const save = () => writeFileSync(reportPath, JSON.stringify(report, null, 2))
const context = await chromium.launchPersistentContext('../.firebase/phase-06-live-browser', {
  channel: 'msedge', headless: false, viewport: { width: 1440, height: 1000 },
  locale: 'en-US', timezoneId: 'Asia/Bangkok',
})
context.setDefaultTimeout(30000)
const page = context.pages()[0] ?? await context.newPage()
mkdirSync('../docs/screenshots/production', { recursive: true })
async function screenshot(name) {
  await page.evaluate(() => { document.activeElement?.blur(); scrollTo(0, 0) })
  await page.screenshot({ path: `../docs/screenshots/production/${name}.png`, fullPage: true })
}
async function browserApi(path, body) {
  const response = await page.evaluate(async ({ url, body }) => {
    const r = await fetch(url, { method: body ? 'POST' : 'GET', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })
    return { status: r.status, data: await r.json() }
  }, { url: api + path, body })
  assert.equal(response.status, 200, `Production API ${path} returned ${response.status}`)
  return response.data
}
const brief = result => ({ duration_minutes: result.duration_minutes, final_moisture_percent_wb: result.final_moisture_percent_wb, water_removed_kg: result.water_removed_kg, energy_kwh: result.energy_kwh, model_version: result.model_version, target_achieved: result.target_achieved ?? null })
const narrativeBrief = payload => ({ provider: payload.narrative.provider, verification: payload.narrative.verification, successfulTools: payload.narrative.tool_trace.filter(call => call.ok).map(call => call.name), failedTools: payload.narrative.tool_trace.filter(call => !call.ok).map(call => call.name) })

try {
  const manifest = JSON.parse(readFileSync('../docs/phase-06-production-build.json', 'utf8'))
  for (const file of manifest.files) {
    const response = await context.request.get(site + '/' + file.path)
    assert.equal(response.status(), 200)
    assert.equal(createHash('sha256').update(await response.body()).digest('hex'), file.sha256, `Deployed artifact mismatch: ${file.path}`)
  }
  report.checks.deployedArtifacts = { passed: true, count: manifest.files.length, sha256MatchesProductionBuild: true }
  await page.goto(site + '/login', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Continue with Google', exact: true }).waitFor({ state: 'visible' })
  report.checks.productionLoginPage = { passed: true, origin: new URL(page.url()).origin }
  await screenshot('login-desktop')
  await page.setViewportSize({ width: 390, height: 900 })
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await screenshot('login-mobile')
  await page.setViewportSize({ width: 1440, height: 1000 })
  report.checks.publicMobileLayout = { passed: true, width: 390, noHorizontalOverflow: true }
  save()
  console.log('PRODUCTION_ASSETS_AND_LOGIN_PAGE_VERIFIED')

  const popupEvent = page.waitForEvent('popup')
  await page.getByRole('button', { name: 'Continue with Google', exact: true }).click()
  const popup = await popupEvent
  await popup.waitForURL(url => url.hostname === 'accounts.google.com', { timeout: 30000 })
  report.checks.googlePopup = { passed: true, origin: new URL(popup.url()).origin, completedSignIn: false }
  save()
  console.log('OWNER_SIGN_IN_REQUIRED: Complete Google sign-in in the production verification browser. No deployment approval is being requested.')

  // These calls originate from the actual deployed page, exercising production CORS.
  // They are public engineering API checks, not a substitute for signed-in UI tests.
  const publicApiChecks = (async () => {
    const health = await browserApi('/api/v1/health')
    const window = await browserApi('/api/v1/workspace/thermal-window')
    const baselineDraft = { ...DOCUMENTED_DRAFT, batchId: 'phase06-live-verification', sourceTemperatureC: 42, availableHeatKw: 2 }
    const changedDraft = { ...baselineDraft, sourceTemperatureC: 35 }
    const baselineBody = buildScenarioBody(baselineDraft, window)
    const changedBody = buildScenarioBody(changedDraft, window)
    const baseline = await browserApi('/api/v1/simulations', baselineBody)
    const changed = await browserApi('/api/v1/simulations', changedBody)
    assert.notEqual(changed.final_moisture_percent_wb, baseline.final_moisture_percent_wb)
    const plan = await browserApi('/api/v1/plans', baselineBody)
    const changedPlan = await browserApi('/api/v1/plans', changedBody)
    report.checks.productionApi = { passed: true, browserOrigin: site, health, baseline: brief(baseline), adjusted: brief(changed), baselinePlan: narrativeBrief(plan), adjustedPlan: narrativeBrief(changedPlan), validation: plan.plan.validation.status }
    report.checks.liveGeminiFunctionCalling = { verified: [plan, changedPlan].some(p => p.narrative.provider === 'gemini' && p.narrative.verification === 'LIVE_GEMINI_VERIFIED' && p.narrative.tool_trace.some(call => call.ok)), baseline: narrativeBrief(plan), adjusted: narrativeBrief(changedPlan) }
    save()
    console.log('PRODUCTION_API_COMPARISON_AND_GEMINI_CHECK_COMPLETE ' + JSON.stringify(report.checks.productionApi))
  })()
  // Avoid an unhandled rejection while waiting for the human-owned Google login.
  const apiOutcome = publicApiChecks.then(() => null, error => error)
  const deadline = Date.now() + 120000
  let signedIn = false
  while (Date.now() < deadline) {
    if (await page.getByRole('heading', { name: 'Home', exact: true }).isVisible()) { signedIn = true; break }
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  const apiError = await apiOutcome
  if (apiError) throw apiError

  if (!signedIn) {
    report.checks.authenticatedLiveJourney = { verified: false, reason: 'Google popup reached the real provider, but no owner-completed sign-in was available within the verification window. Four-item sidebar, batch/result UI, production Firestore history, and refresh/session restoration remain unverified live.' }
    save()
    console.log('SIGNED_IN_LIVE_CHECKS_UNVERIFIED_NO_OWNER_SIGN_IN')
  } else {
    report.checks.googlePopup.completedSignIn = true
    const links = await page.locator('nav a').allTextContents()
    assert.deepEqual(links.map(text => text.trim()), ['Home', 'My Shop', 'Drying History', 'Settings'])
    await screenshot('home-desktop')
    await page.getByRole('link', { name: 'Create a Drying Batch', exact: true }).click()
    for (const [id, value] of Object.entries({ mass: '12', initial: '62', target: '25', duration: '480', temperature: '42', heat: '2' })) await page.locator('#' + id).fill(value)
    await page.getByText('Additional drying conditions', { exact: true }).click()
    for (const [id, value] of Object.entries({ minimum: '30', maximum: '60', humidity: '55' })) await page.locator('#' + id).fill(value)
    const baselineResponse = page.waitForResponse(r => r.url() === api + '/api/v1/simulations' && r.request().method() === 'POST')
    await page.getByRole('button', { name: 'Generate AI Drying Plan', exact: true }).click()
    const br = await baselineResponse
    assert.equal(br.status(), 200)
    const baseline = await br.json()
    await page.getByRole('heading', { name: 'Your AI Drying Plan', exact: true }).waitFor({ timeout: 150000 })
    const keyResults = page.locator('.drying-key-results').first()
    const originalText = await keyResults.innerText()
    assert(originalText.includes(String(baseline.final_moisture_percent_wb)))
    let requests = 0
    page.on('request', request => { if (request.url() === api + '/api/v1/simulations' && request.method() === 'POST') requests++ })
    await page.getByRole('slider').fill('35')
    assert.equal(requests, 0)
    const changedResponse = page.waitForResponse(r => r.url() === api + '/api/v1/simulations' && r.request().method() === 'POST')
    await page.getByRole('button', { name: 'Run What-If Simulation', exact: true }).click()
    const cr = await changedResponse
    assert.equal(cr.status(), 200)
    const changed = await cr.json()
    await page.getByTestId('after-moisture').waitFor({ timeout: 150000 })
    assert.equal((await page.getByTestId('after-moisture').innerText()).trim(), changed.final_moisture_percent_wb + '% wet basis')
    assert.equal((await page.getByTestId('before-moisture').innerText()).trim(), baseline.final_moisture_percent_wb + '% wet basis')
    assert.equal(await keyResults.innerText(), originalText)
    assert.equal(requests, 1)
    await screenshot('plan-desktop')
    await page.setViewportSize({ width: 390, height: 900 })
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await screenshot('plan-mobile')
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.getByText('Calculation history saved', { exact: true }).waitFor({ timeout: 30000 })
    await page.locator('nav a[href="/history"]').click()
    await page.getByLabel('Record type').selectOption('simulations')
    await page.locator('.drying-history-list li button').first().waitFor()
    await page.reload()
    await page.getByRole('heading', { name: 'Drying History', exact: true }).waitFor()
    await page.getByLabel('Record type').selectOption('simulations')
    await page.locator('.drying-history-list li button').first().click()
    assert((await page.locator('.saved-plan-summary').innerText()).includes(String(changed.final_moisture_percent_wb)))
    await screenshot('history-desktop')
    report.checks.authenticatedLiveJourney = { verified: true, sidebar: links.map(t => t.trim()), baseline: brief(baseline), adjusted: brief(changed), baselineUnchanged: true, realBackendRequest: true, firestoreHistoryReopened: true, refreshSessionRestored: true, mobileWidth: 390, noHorizontalOverflow: true }
    save()
    console.log('AUTHENTICATED_PRODUCTION_JOURNEY_VERIFIED')
  }
} catch (error) {
  report.criticalError = error instanceof Error ? error.message : String(error)
  save()
  console.error('CRITICAL_LIVE_VERIFICATION_ERROR: ' + report.criticalError)
  process.exitCode = 1
} finally {
  report.finishedAt = new Date().toISOString()
  save()
  await context.close()
}
