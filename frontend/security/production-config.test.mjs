import {
  mkdtempSync,
  writeFileSync,
  unlinkSync,
  rmdirSync,
  existsSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { spawnSync } from 'node:child_process'
import { loadEnv } from 'vite'
const effective = {
  ...loadEnv('production', process.cwd(), ''),
  ...process.env,
}
const api = 'https://br-api-916064977717.asia-southeast1.run.app'
function validate(overrides = {}) {
  const result = spawnSync(
    process.execPath,
    ['scripts/validate-production.mjs'],
    {
      env: { ...effective, ...overrides },
      encoding: 'utf8',
    },
  )
  assert.ifError(result.error)
  return result.status
}
test('effective production config matches registered public app and approved API', () => {
  assert.equal(effective.VITE_FIREBASE_PROJECT_ID, 'breake-the-rules')
  assert.equal(
    effective.VITE_FIREBASE_AUTH_DOMAIN,
    'breake-the-rules.firebaseapp.com',
  )
  assert.equal(
    effective.VITE_FIREBASE_APP_ID,
    '1:330692718529:web:a9b24b70cdfe2a7c980940',
  )
  assert.equal(effective.VITE_FIREBASE_MESSAGING_SENDER_ID, '330692718529')
  assert.match(effective.VITE_FIREBASE_API_KEY, /^AIza[\w-]{35}$/)
  assert.ok(
    !effective.VITE_FIREBASE_EMULATORS ||
      effective.VITE_FIREBASE_EMULATORS === 'false',
  )
  assert.equal(effective.VITE_DATA_MODE, 'http')
  assert.equal(effective.VITE_API_BASE_URL, api)
  assert.equal(validate(), 0)
})
for (const [name, overrides] of [
  ['preview mode', { VITE_DATA_MODE: 'preview' }],
  ['placeholder key', { VITE_FIREBASE_API_KEY: 'YOUR_API_KEY' }],
  ['missing key', { VITE_FIREBASE_API_KEY: '' }],
  ['HTTPS localhost', { VITE_API_BASE_URL: 'https://localhost:8015' }],
  ['API path', { VITE_API_BASE_URL: api + '/wrong' }],
  ['emulators', { VITE_FIREBASE_EMULATORS: 'true' }],
  ['wrong Firebase project', { VITE_FIREBASE_PROJECT_ID: 'demo-other' }],
  ['missing app ID', { VITE_FIREBASE_APP_ID: '' }],
  ['HTTP API', { VITE_API_BASE_URL: 'http://localhost:8015' }],
  ['wrong HTTPS API', { VITE_API_BASE_URL: 'https://example.invalid' }],
  ['wrong Auth domain', { VITE_FIREBASE_AUTH_DOMAIN: 'other.firebaseapp.com' }],
  ['wrong app ID', { VITE_FIREBASE_APP_ID: '1:123:web:wrong' }],
  ['wrong sender ID', { VITE_FIREBASE_MESSAGING_SENDER_ID: '123' }],
  ['fixture mode', { VITE_DATA_MODE: 'fixture' }],
])
  test(`build guard rejects ${name}`, () => {
    assert.notEqual(
      validate(overrides),
      0,
      'Unsafe build configuration was accepted',
    )
  })

for (const field of [
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
]) {
  test(`rejects missing ${field}`, () =>
    assert.notEqual(validate({ [field]: '' }), 0))
  test(`rejects placeholder ${field}`, () =>
    assert.notEqual(validate({ [field]: 'REPLACE_ME' }), 0))
}

test('guard loads Vite production files and honors process overrides', () => {
  const directory = mkdtempSync(join(tmpdir(), 'br-config-'))
  const inherited = { ...process.env }
  for (const key of Object.keys(inherited))
    if (key.startsWith('VITE_')) delete inherited[key]
  const invoke = (overrides = {}) =>
    spawnSync(process.execPath, [resolve('scripts/validate-production.mjs')], {
      cwd: directory,
      env: { ...inherited, ...overrides },
      encoding: 'utf8',
    })
  try {
    const vars = Object.entries(effective)
      .filter(([key]) => key.startsWith('VITE_'))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')
    writeFileSync(join(directory, '.env.production'), vars)
    let result = invoke()
    assert.ifError(result.error)
    assert.equal(result.status, 0)
    writeFileSync(
      join(directory, '.env.production.local'),
      'VITE_API_BASE_URL=https://wrong.invalid\n',
    )
    result = invoke()
    assert.ifError(result.error)
    assert.notEqual(result.status, 0)
    result = invoke({ VITE_API_BASE_URL: api })
    assert.ifError(result.error)
    assert.equal(result.status, 0)
  } finally {
    for (const name of ['.env.production', '.env.production.local'])
      if (existsSync(join(directory, name))) unlinkSync(join(directory, name))
    rmdirSync(directory)
  }
})
