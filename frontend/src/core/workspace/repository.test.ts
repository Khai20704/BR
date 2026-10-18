import { beforeEach, expect, it, vi } from 'vitest'
import { DOCUMENTED_DRAFT } from '@/core/scenario/scenario-draft'
const mock = vi.hoisted(() => ({
  version: 0,
  exists: false,
  set: vi.fn(),
  stored: undefined as unknown,
}))
vi.mock('@/core/firebase/client', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, ...parts: string[]) => parts.join('/')),
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  getDocs: vi.fn(),
  deleteDoc: vi.fn(),
  serverTimestamp: () => 'server-time',
  getDoc: vi.fn(async () => ({
    exists: () => mock.exists,
    data: () => mock.stored,
  })),
  runTransaction: vi.fn(async (_db, fn) =>
    fn({
      get: async () => ({
        exists: () => mock.exists,
        data: () => ({ version: mock.version, createdAt: 'original-time' }),
      }),
      set: mock.set,
    }),
  ),
}))
import { createWorkspaceRepository } from './repository'
beforeEach(() => {
  mock.version = 0
  mock.exists = false
  mock.set.mockClear()
})
it('scopes all writes to the user and rejects stale revisions before writing', async () => {
  const repo = createWorkspaceRepository('alice')
  expect(await repo.save(DOCUMENTED_DRAFT, null, 0)).toBe(1)
  expect(mock.set.mock.calls[0]?.[0]).toBe(
    'users/alice/thermal_scenarios/active',
  )
  mock.set.mockClear()
  mock.exists = true
  mock.version = 2
  await expect(repo.save(DOCUMENTED_DRAFT, null, 1)).rejects.toThrow(
    'another tab',
  )
  expect(mock.set).not.toHaveBeenCalled()
})
it('retries immutable history with the same ID without overwriting existing results', async () => {
  const repo = createWorkspaceRepository('alice')
  mock.exists = true
  await repo.saveRun(
    'stable-id',
    'simulations',
    { draft: DOCUMENTED_DRAFT },
    { energy_kwh: 7.2 },
    'thin-layer-1.0',
  )
  expect(mock.set).not.toHaveBeenCalled()
})
it('validates restored workspace and rejects invalid user paths', async () => {
  expect(() => createWorkspaceRepository('alice/../bob')).toThrow()
  mock.exists = true
  mock.stored = {
    draft: { ...DOCUMENTED_DRAFT, massKg: -10 },
    version: 1,
    site: null,
  }
  await expect(createWorkspaceRepository('alice').load()).rejects.toThrow()
})
