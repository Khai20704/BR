import { readFileSync } from 'node:fs'
import { before, after, test } from 'node:test'
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing'
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  collection,
  collectionGroup,
  query,
  limit,
  getDocs,
} from 'firebase/firestore'
let env
const claims = {
  email: 'review@example.test',
  name: 'Review User',
  picture: 'https://example.test/avatar.png',
  email_verified: true,
}
const profile = () => ({
  displayName: claims.name,
  email: claims.email,
  photoURL: claims.picture,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
})
const site = () => ({
  name: 'Roastery',
  location: 'Bangkok',
  acModel: 'AC-1',
  capacity: 5,
  source: 'AC condenser waste heat',
  provenance: 'Synthetic / UI preview',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
})
const batch = () => ({
  siteId: 'active',
  materialType: 'spent-coffee-grounds',
  wetMassKg: 12,
  initialMoisture: 62,
  targetMoisture: 25,
  maxDurationMin: 480,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
})
const scenario = () => ({
  draft: {
    batchId: 'batch',
    massKg: 12,
    initialMoisturePercentWb: 62,
    targetMoisturePercentWb: 25,
    maxDurationMinutes: 480,
    minTemperatureC: 30,
    maxTemperatureC: 60,
    relativeHumidity: 0.55,
  },
  site: null,
  siteId: 'active',
  dataProvenance: 'SYNTHETIC',
  version: 1,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
})
const history = () => ({
  inputSnapshot: '{"request":{}}',
  result: '{"energy_kwh":7.2}',
  modelVersion: 'thin-layer-1.0',
  modelName: 'not applicable',
  dataProvenance: 'MODEL_PREDICTION',
  siteId: 'active',
  batchId: 'active',
  scenarioId: 'active',
  createdAt: serverTimestamp(),
})
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-br-phase05',
    firestore: {
      host: '127.0.0.1',
      port: 8085,
      rules: readFileSync('../firestore.rules', 'utf8'),
    },
  })
  await env.clearFirestore()
})
after(async () => {
  await env?.cleanup()
})
// These are security requirements, not assertions that preserve insecure behavior.
for (const [field, value] of [
  ['email', 'victim@example.test'],
  ['displayName', 'Impersonated User'],
  ['photoURL', 'https://example.test/impersonated.png'],
]) {
  for (const action of ['create', 'update'])
    test(`profile ${action} cannot spoof Auth ${field}`, async () => {
      const uid = `spoof-${action}-${field}`,
        db = env.authenticatedContext(uid, claims).firestore(),
        ref = doc(db, 'users', uid)
      if (action === 'create')
        await assertFails(setDoc(ref, { ...profile(), [field]: value }))
      else {
        await assertSucceeds(setDoc(ref, profile()))
        await assertFails(
          updateDoc(ref, { [field]: value, updatedAt: serverTimestamp() }),
        )
      }
    })
}
test('profile rejects extra identity/privilege fields', async () => {
  const db = env.authenticatedContext('extra', claims).firestore(),
    ref = doc(db, 'users/extra')
  await assertSucceeds(setDoc(ref, profile()))
  for (const [key, value] of [
    ['uid', 'victim'],
    ['emailVerified', true],
    ['providerId', 'google.com'],
    ['admin', true],
  ])
    await assertFails(
      updateDoc(ref, { [key]: value, updatedAt: serverTimestamp() }),
    )
})
for (const [kind, make] of [
  ['profile', profile],
  ['sites', site],
  ['batches', batch],
  ['thermal_scenarios', scenario],
])
  test(`${kind}: timestamps, ownership, and anonymous access`, async () => {
    const uid = `dates-${kind}`,
      a = env.authenticatedContext(uid, claims).firestore(),
      b = env.authenticatedContext('outsider', claims).firestore(),
      anon = env.unauthenticatedContext().firestore()
    const path =
        kind === 'profile' ? `users/${uid}` : `users/${uid}/${kind}/active`,
      ref = doc(a, path),
      past = Timestamp.fromMillis(1),
      future = Timestamp.fromMillis(4102444800000)
    await assertFails(setDoc(ref, { ...make(), createdAt: past }))
    await assertFails(setDoc(ref, { ...make(), updatedAt: past }))
    await assertSucceeds(setDoc(ref, make()))
    const extra = kind === 'thermal_scenarios' ? { version: 2 } : {}
    for (const timestamp of [past, future]) {
      await assertFails(
        updateDoc(ref, {
          ...extra,
          createdAt: timestamp,
          updatedAt: serverTimestamp(),
        }),
      )
      await assertFails(updateDoc(ref, { ...extra, updatedAt: timestamp }))
    }
    const changed =
      kind === 'profile'
        ? { email: 'changed@example.test' }
        : kind === 'sites'
          ? { capacity: 6 }
          : kind === 'batches'
            ? { wetMassKg: 13 }
            : { version: 2 }
    // Reusing the previous updatedAt does not establish the server time for a new write.
    await assertFails(updateDoc(ref, changed))
    await assertSucceeds(
      updateDoc(ref, { ...extra, updatedAt: serverTimestamp() }),
    )
    for (const db of [b, anon]) {
      await assertFails(getDoc(doc(db, path)))
      await assertFails(setDoc(doc(db, path), make()))
      await assertFails(
        updateDoc(doc(db, path), { updatedAt: serverTimestamp() }),
      )
      await assertFails(deleteDoc(doc(db, path)))
    }
  })
for (const kind of ['simulations', 'ai_plans', 'replanning_runs', 'benchmarks'])
  test(`${kind}: bounded owner-only queries and immutable time`, async () => {
    const uid = `query-${kind}`,
      a = env.authenticatedContext(uid, claims).firestore(),
      b = env.authenticatedContext('outsider', claims).firestore(),
      anon = env.unauthenticatedContext().firestore(),
      path = `users/${uid}/${kind}`
    await assertSucceeds(setDoc(doc(a, path, 'run'), history()))
    await assertSucceeds(getDocs(query(collection(a, path), limit(20))))
    await assertFails(getDocs(collection(a, path)))
    await assertFails(getDocs(query(collection(a, path), limit(21))))
    await assertFails(getDocs(query(collectionGroup(a, kind), limit(20))))
    await assertFails(
      updateDoc(doc(a, path, 'run'), { createdAt: serverTimestamp() }),
    )
    await assertFails(
      setDoc(doc(a, path, 'backdated'), {
        ...history(),
        createdAt: Timestamp.fromMillis(1),
      }),
    )
    for (const db of [b, anon]) {
      await assertFails(getDocs(query(collection(db, path), limit(20))))
      await assertFails(getDocs(collection(db, path)))
      await assertFails(setDoc(doc(db, path, 'intruder'), history()))
    }
  })
test('unmatched paths and root user collection remain default-deny', async () => {
  const db = env.authenticatedContext('default', claims).firestore(),
    anon = env.unauthenticatedContext().firestore()
  for (const client of [db, anon]) {
    await assertFails(setDoc(doc(client, 'public/write'), { value: 1 }))
    await assertFails(
      setDoc(doc(client, 'users/default/unknown/write'), { value: 1 }),
    )
    await assertFails(getDocs(query(collection(client, 'users'), limit(20))))
  }
})

for (const [label, token] of [
  ['missing', {}],
  ['null', { email: null, name: null, picture: null }],
])
  test(`legitimate ${label} claims normalize to empty strings`, async () => {
    const uid = `optional-${label}`,
      db = env.authenticatedContext(uid, token).firestore(),
      ref = doc(db, 'users', uid)
    const empty = { ...profile(), email: '', displayName: '', photoURL: '' }
    await assertSucceeds(setDoc(ref, empty))
    await assertSucceeds(updateDoc(ref, { updatedAt: serverTimestamp() }))
    for (const field of ['email', 'displayName', 'photoURL'])
      await assertFails(
        updateDoc(ref, { [field]: 'invented', updatedAt: serverTimestamp() }),
      )
  })
test('refreshed Auth claims can update mirror without changing createdAt', async () => {
  const uid = 'refresh-profile',
    first = env.authenticatedContext(uid, claims).firestore()
  await assertSucceeds(setDoc(doc(first, 'users', uid), profile()))
  const next = {
    email: 'new@example.test',
    name: 'New Name',
    picture: 'https://example.test/new.png',
  }
  const refreshed = env.authenticatedContext(uid, next).firestore(),
    ref = doc(refreshed, 'users', uid)
  await assertFails(
    updateDoc(ref, {
      email: claims.email,
      displayName: claims.name,
      photoURL: claims.picture,
      updatedAt: serverTimestamp(),
    }),
  )
  await assertSucceeds(
    updateDoc(ref, {
      email: next.email,
      displayName: next.name,
      photoURL: next.picture,
      updatedAt: serverTimestamp(),
    }),
  )
  await assertSucceeds(updateDoc(ref, { updatedAt: serverTimestamp() }))
})
