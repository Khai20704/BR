/* eslint-disable react-refresh/only-export-components -- Context and hook share one module. */
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { DOCUMENTED_DRAFT, type ScenarioDraft } from './scenario-draft'
import { useAuth } from '@/core/auth/context'
import {
  createWorkspaceRepository,
  type WorkspaceRepository,
} from '@/core/workspace/repository'
import {
  draftSchema,
  siteSchema,
  type Site,
  type HistoryKind,
} from '@/core/workspace/model'
import { syncAuthProfile } from '@/core/auth/sync-profile'
import { installRecorder } from '@/core/workspace/recording'

export interface BatchPatch {
  readonly massKg: number
  readonly initialMoisturePercentWb: number
  readonly targetMoisturePercentWb: number
  readonly maxDurationMinutes: number
}
interface Value {
  draft: ScenarioDraft
  revision: number
  site: Site | null
  ready: boolean
  status: string
  error: string
  historyStatus: string
  applyBatch: (patch: BatchPatch) => Promise<void>
  applySource: (temperatureC: number, heatKw: number) => Promise<void>
  applySite: (values: Record<string, unknown>) => Promise<void>
  replaceDraft: (draft: ScenarioDraft) => Promise<void>
  resetToDocumented: () => void
  retrySave: () => Promise<void>
  retryHistory: () => Promise<void>
  repository: WorkspaceRepository | null
}
const Context = createContext<Value | null>(null)
export function ScenarioProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [repository] = useState(() =>
    user ? createWorkspaceRepository(user.uid) : null,
  )
  const [draft, setDraft] = useState<ScenarioDraft>(DOCUMENTED_DRAFT)
  const [site, setSite] = useState<Site | null>(null)
  const [revision, setRevision] = useState(0)
  const [ready, setReady] = useState(!repository)
  const [status, setStatus] = useState(
    repository ? 'Loading workspace' : 'Session preview',
  )
  const [error, setError] = useState('')
  const [historyStatus, setHistoryStatus] = useState('')
  const version = useRef(0)
  const current = useRef({ draft: DOCUMENTED_DRAFT, site: null as Site | null })
  const editNumber = useRef(0)
  const queue = useRef(Promise.resolve())
  const active = useRef(true)
  const pending = useRef(new Map<string, () => Promise<void>>())
  useEffect(() => {
    active.current = true
    const unsavedRuns = pending.current
    if (repository && user) {
      void repository
        .load()
        .then((saved) => {
          if (!active.current) return
          if (saved) {
            version.current = saved.version
            current.current = { draft: saved.draft, site: saved.site }
            setDraft(saved.draft)
            setSite(saved.site)
          }
          setReady(true)
          setStatus(
            saved
              ? 'Saved workspace restored'
              : 'New workspace - not saved yet',
          )
        })
        .catch(() => {
          if (active.current)
            setError(
              'Unable to load workspace. Reload to retry; edits are disabled to protect saved data.',
            )
        })
      void syncAuthProfile(
        user,
        repository.profile,
        () => active.current,
      ).catch(() => {
        if (active.current) setError('Profile update failed. Reload to retry.')
      })
    }
    return () => {
      active.current = false
      unsavedRuns.clear()
    }
  }, [repository, user])
  useEffect(() => {
    if (!repository) return
    const paths: Record<string, HistoryKind> = {
      '/api/v1/simulations': 'simulations',
      '/api/v1/plans': 'ai_plans',
      '/api/v1/plans/replan': 'replanning_runs',
      '/api/v1/benchmark': 'benchmarks',
    }
    return installRecorder(() => {
      const runSite = current.current.site
      return async (path, input, result, runDraft) => {
        const kind = paths[path]
        if (!kind || !active.current) return
        const id = crypto.randomUUID()
        const payload = result as {
          model_version?: string
          plan?: { metadata?: { model_version?: string } }
        }
        const snapshot = { request: input, draft: runDraft, site: runSite }
        const persist = () =>
          repository.saveRun(
            id,
            kind,
            snapshot,
            result,
            payload.model_version ??
              payload.plan?.metadata?.model_version ??
              'unreported',
          )
        pending.current.set(id, persist)
        setHistoryStatus('Saving calculation history...')
        try {
          await persist()
          pending.current.delete(id)
          if (active.current)
            setHistoryStatus(
              pending.current.size
                ? 'Some history is not saved. Retry available.'
                : 'Calculation history saved',
            )
        } catch {
          if (active.current)
            setHistoryStatus(
              'Calculation succeeded, but history was NOT saved. Retry without calling the engine again.',
            )
        }
      }
    })
  }, [repository])
  async function save(next: { draft: ScenarioDraft; site: Site | null }) {
    if (!ready) throw new Error('Workspace is still loading.')
    draftSchema.parse(next.draft)
    current.current = next
    setDraft(next.draft)
    setSite(next.site)
    setRevision((v) => v + 1)
    const number = ++editNumber.current
    if (!repository) {
      setStatus('Session preview - not persisted')
      return
    }
    setStatus('Saving...')
    setError('')
    const job = queue.current
      .catch(() => {})
      .then(async () => {
        if (!active.current) throw new Error('Session ended.')
        version.current = await repository.save(
          next.draft,
          next.site,
          version.current,
        )
      })
    queue.current = job
    try {
      await job
      if (active.current && number === editNumber.current) setStatus('Saved')
    } catch (e) {
      if (active.current) {
        setStatus('Not saved')
        setError(e instanceof Error ? e.message : 'Save failed. Retry.')
      }
      throw e
    }
  }
  async function retryHistory() {
    for (const [id, persist] of pending.current) {
      try {
        await persist()
        pending.current.delete(id)
      } catch {
        setHistoryStatus('History still not saved. Check connection and retry.')
        return
      }
    }
    setHistoryStatus('Calculation history saved')
  }
  const value: Value = {
    draft,
    site,
    revision,
    ready,
    status,
    error,
    historyStatus,
    repository,
    applyBatch: (patch) =>
      save({
        ...current.current,
        draft: { ...current.current.draft, ...patch },
      }),
    applySource: (sourceTemperatureC, availableHeatKw) =>
      save({
        ...current.current,
        draft: {
          ...current.current.draft,
          sourceTemperatureC,
          availableHeatKw,
        },
      }),
    applySite: (values) =>
      save({ ...current.current, site: siteSchema.parse(values) }),
    replaceDraft: (next) =>
      save({ ...current.current, draft: draftSchema.parse(next) }),
    resetToDocumented: () => {
      void save({ ...current.current, draft: DOCUMENTED_DRAFT }).catch(() => {})
    },
    retrySave: () => save(current.current),
    retryHistory,
  }
  return <Context.Provider value={value}>{children}</Context.Provider>
}
export function useScenario() {
  const context = useContext(Context)
  if (!context)
    throw new Error('useScenario must be used inside ScenarioProvider.')
  return context
}
