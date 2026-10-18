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
  collection,
  query,
  limit,
  getDocs,
} from 'firebase/firestore'
let env
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
  await env.cleanup()
})
const profile = () => ({
  displayName: 'Alice',
  email: 'alice@example.test',
  photoURL: '',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
})
const draft = {
  batchId: 'batch',
  massKg: 12,
  initialMoisturePercentWb: 62,
  targetMoisturePercentWb: 25,
  maxDurationMinutes: 480,
  minTemperatureC: 30,
  maxTemperatureC: 60,
  relativeHumidity: 0.55,
}
const scenario = () => ({
  draft,
  site: null,
  siteId: 'active',
  dataProvenance: 'SYNTHETIC',
  version: 1,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
})
const run = () => ({
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
test('owner can create/read profile; cross-user and anonymous access denied', async () => {
  const a = env
      .authenticatedContext('alice', {
        email: 'alice@example.test',
        name: 'Alice',
      })
      .firestore(),
    b = env.authenticatedContext('bob').firestore(),
    anon = env.unauthenticatedContext().firestore()
  await assertSucceeds(setDoc(doc(a, 'users/alice'), profile()))
  await assertSucceeds(getDoc(doc(a, 'users/alice')))
  await assertFails(getDoc(doc(b, 'users/alice')))
  await assertFails(
    updateDoc(doc(b, 'users/alice'), { displayName: 'intruder' }),
  )
  await assertFails(getDoc(doc(anon, 'users/alice')))
  await assertFails(setDoc(doc(anon, 'users/nobody'), profile()))
  await assertFails(setDoc(doc(b, 'users/alice'), profile()))
})
test('workspace shape, ranges, timestamps and revision enforced', async () => {
  const a = env
    .authenticatedContext('alice', {
      email: 'alice@example.test',
      name: 'Alice',
    })
    .firestore()
  const ref = doc(a, 'users/alice/thermal_scenarios/active')
  await assertSucceeds(setDoc(ref, scenario()))
  await assertFails(
    updateDoc(ref, {
      draft: { ...draft, massKg: -1 },
      version: 2,
      updatedAt: serverTimestamp(),
    }),
  )
  await assertFails(
    updateDoc(ref, {
      draft: { ...draft, targetMoisturePercentWb: 90 },
      version: 2,
      updatedAt: serverTimestamp(),
    }),
  )
  await assertFails(
    updateDoc(ref, { version: 1, updatedAt: serverTimestamp() }),
  )
  await assertFails(
    updateDoc(ref, {
      ownerUid: 'bob',
      version: 2,
      updatedAt: serverTimestamp(),
    }),
  )
  await assertSucceeds(
    updateDoc(ref, {
      draft: { ...draft, massKg: 10 },
      version: 2,
      updatedAt: serverTimestamp(),
    }),
  )
  await assertFails(
    updateDoc(ref, {
      createdAt: serverTimestamp(),
      version: 3,
      updatedAt: serverTimestamp(),
    }),
  )
})
test('all history collections isolated, immutable, bounded and deletable by owner', async () => {
  const a = env
      .authenticatedContext('alice', {
        email: 'alice@example.test',
        name: 'Alice',
      })
      .firestore(),
    b = env.authenticatedContext('bob').firestore(),
    anon = env.unauthenticatedContext().firestore()
  for (const kind of [
    'simulations',
    'ai_plans',
    'replanning_runs',
    'benchmarks',
  ]) {
    const path = `users/alice/${kind}/run`
    const ref = doc(a, path)
    await assertSucceeds(setDoc(ref, run()))
    await assertSucceeds(getDoc(ref))
    await assertFails(getDoc(doc(b, path)))
    await assertFails(setDoc(doc(b, path), run()))
    await assertFails(getDoc(doc(anon, path)))
    await assertFails(updateDoc(ref, { result: '{"changed":true}' }))
    await assertFails(deleteDoc(doc(b, path)))
    await assertSucceeds(
      getDocs(query(collection(a, `users/alice/${kind}`), limit(20))),
    )
    await assertFails(
      getDocs(query(collection(a, `users/alice/${kind}`), limit(21))),
    )
    await assertFails(
      setDoc(doc(a, `users/alice/${kind}/huge`), {
        ...run(),
        result: 'x'.repeat(180001),
      }),
    )
    await assertFails(
      setDoc(doc(a, `users/alice/${kind}/token`), {
        ...run(),
        idToken: 'forbidden',
      }),
    )
    await assertFails(
      setDoc(doc(a, `users/alice/${kind}/measured`), {
        ...run(),
        dataProvenance: 'MEASURED',
      }),
    )
    await assertSucceeds(deleteDoc(ref))
  }
})
test('site and batch validation reject wrong shapes and values', async () => {
  const db = env
    .authenticatedContext('alice', {
      email: 'alice@example.test',
      name: 'Alice',
    })
    .firestore()
  const site = {
    name: 'Roastery',
    location: 'Bangkok',
    acModel: 'AC-1',
    capacity: 5,
    source: 'AC condenser waste heat',
    provenance: 'Synthetic / UI preview',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  await assertSucceeds(setDoc(doc(db, 'users/alice/sites/active'), site))
  await assertFails(
    setDoc(doc(db, 'users/alice/sites/invalid'), { ...site, capacity: -1 }),
  )
  const batch = {
    siteId: 'active',
    materialType: 'spent-coffee-grounds',
    wetMassKg: 12,
    initialMoisture: 62,
    targetMoisture: 25,
    maxDurationMin: 480,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  await assertSucceeds(setDoc(doc(db, 'users/alice/batches/active'), batch))
  await assertFails(
    setDoc(doc(db, 'users/alice/batches/invalid'), { ...batch, wetMassKg: 0 }),
  )
  await assertFails(
    setDoc(doc(db, 'users/alice/batches/invalid'), {
      ...batch,
      maxDurationMin: 10081,
    }),
  )
})
