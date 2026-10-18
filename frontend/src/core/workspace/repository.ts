import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  runTransaction,
  serverTimestamp,
  deleteDoc,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/core/firebase/client'
import type { ScenarioDraft } from '@/core/scenario/scenario-draft'
import {
  draftSchema,
  siteSchema,
  encodeSnapshot,
  type Site,
  type HistoryKind,
  type StoredRun,
} from './model'

function database() {
  if (!db) throw new Error('Firestore is not configured.')
  return db
}
export function createWorkspaceRepository(uid: string) {
  if (!uid || uid.includes('/')) throw new Error('Invalid authenticated user.')
  const ref = doc(database(), 'users', uid, 'thermal_scenarios', 'active')
  return {
    async load() {
      const snap = await getDoc(ref)
      if (!snap.exists()) return null
      const data = snap.data()
      return {
        draft: draftSchema.parse(data.draft),
        site: data.site ? siteSchema.parse(data.site) : null,
        version: Number(data.version),
      }
    },
    async profile(profile: {
      displayName: string
      email: string
      photoURL: string
    }) {
      const userRef = doc(database(), 'users', uid)
      await runTransaction(database(), async (tx) => {
        const old = await tx.get(userRef)
        tx.set(userRef, {
          ...profile,
          createdAt: old.exists() ? old.data().createdAt : serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      })
    },
    async save(
      draft: ScenarioDraft,
      site: Site | null,
      expectedVersion: number,
    ) {
      const checked = draftSchema.parse(draft)
      if (site) siteSchema.parse(site)
      return runTransaction(database(), async (tx) => {
        const old = await tx.get(ref)
        const siteRef = doc(database(), 'users', uid, 'sites', 'active')
        const batchRef = doc(database(), 'users', uid, 'batches', 'active')
        const oldSite = await tx.get(siteRef)
        const oldBatch = await tx.get(batchRef)
        const version = old.exists() ? Number(old.data().version) : 0
        if (version !== expectedVersion)
          throw new Error(
            'Workspace changed in another tab. Reload before saving; your draft has not overwritten it.',
          )
        const timestamps = {
          createdAt: old.exists() ? old.data().createdAt : serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
        const clean = JSON.parse(JSON.stringify(checked)) as ScenarioDraft
        tx.set(ref, {
          draft: clean,
          site,
          siteId: 'active',
          dataProvenance:
            checked.sourceTemperatureC === undefined
              ? 'SYNTHETIC'
              : 'MANUAL_UNVERIFIED',
          version: version + 1,
          ...timestamps,
        })
        tx.set(batchRef, {
          siteId: 'active',
          materialType: 'spent-coffee-grounds',
          wetMassKg: checked.massKg,
          initialMoisture: checked.initialMoisturePercentWb,
          targetMoisture: checked.targetMoisturePercentWb,
          maxDurationMin: checked.maxDurationMinutes,
          createdAt: oldBatch.exists()
            ? oldBatch.data().createdAt
            : serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        if (site)
          tx.set(siteRef, {
            ...site,
            createdAt: oldSite.exists()
              ? oldSite.data().createdAt
              : serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        return version + 1
      })
    },
    async saveRun(
      id: string,
      kind: HistoryKind,
      input: unknown,
      result: unknown,
      modelVersion: string,
    ) {
      const runRef = doc(database(), 'users', uid, kind, id)
      const payload = {
        inputSnapshot: encodeSnapshot(input),
        result: encodeSnapshot(result),
        modelVersion: modelVersion.slice(0, 120),
        modelName:
          kind === 'ai_plans'
            ? 'backend-configured (not exposed by API)'
            : 'not applicable',
        dataProvenance: 'MODEL_PREDICTION',
        siteId: 'active',
        batchId: 'active',
        scenarioId: 'active',
        createdAt: serverTimestamp(),
      }
      // Stable ID makes save retries idempotent; historical records are immutable.
      await runTransaction(database(), async (tx) => {
        const old = await tx.get(runRef)
        if (!old.exists()) tx.set(runRef, payload)
      })
    },
    async list(kind: HistoryKind, cursor?: QueryDocumentSnapshot) {
      const base = collection(database(), 'users', uid, kind)
      const q = cursor
        ? query(
            base,
            orderBy('createdAt', 'desc'),
            startAfter(cursor),
            limit(20),
          )
        : query(base, orderBy('createdAt', 'desc'), limit(20))
      const snapshot = await getDocs(q)
      return {
        rows: snapshot.docs.map((d) => {
          const data = d.data()
          if (
            typeof data.inputSnapshot !== 'string' ||
            typeof data.result !== 'string'
          )
            throw new Error('Invalid saved record.')
          JSON.parse(data.inputSnapshot)
          JSON.parse(data.result)
          return { ...data, id: d.id, kind } as StoredRun
        }),
        cursor: snapshot.docs.at(-1),
        more: snapshot.size === 20,
      }
    },
    async remove(kind: HistoryKind, id: string) {
      await deleteDoc(doc(database(), 'users', uid, kind, id))
    },
  }
}
export type WorkspaceRepository = ReturnType<typeof createWorkspaceRepository>
