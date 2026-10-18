import { mapThermalWindow } from '@/features/thermal-profile/infrastructure/repositories/HttpPreviewRepository'
import { loadSourceWindow } from '@/core/scenario/scenario-gateway'
import { createHttpClient } from '@/core/api/http-client'
import { parseEnvironment } from '@/core/config/env'
import { resolveDataMode, type DataMode } from '@/core/config/data-mode'
import type { BenchmarkPreview } from '@/features/benchmark/domain/models/BenchmarkPreview'
import type { PlanningPreview } from '@/features/ai-planning/domain/models/PlanningPreview'
import type { ReplanningPreview } from '@/features/replanning/domain/models/ReplanningPreview'
import type { SimulationPreview } from '@/features/simulation/domain/models/SimulationPreview'
import type { ThermalPreview } from '@/features/thermal-profile/domain/models/ThermalPreview'
import type { ScenarioDraft } from '@/core/scenario/scenario-draft'
import { loadScenarioSimulation } from '@/features/simulation/infrastructure/repositories/HttpPreviewRepository'
import { loadScenarioPlan } from '@/features/ai-planning/infrastructure/repositories/HttpPreviewRepository'
import { loadScenarioBenchmark } from '@/features/benchmark/infrastructure/repositories/HttpPreviewRepository'
import { createReplanPreview } from '@/features/replanning/infrastructure/repositories/HttpPreviewRepository'
import { createBatchMassBalance } from '@/features/batch/infrastructure/api/BatchMassBalance'

/** A page loader that runs the scenario currently being edited. */
export type PreviewLoader<T> = () => Promise<T>
/** The same, for endpoints that must be told which scenario to compute. */
export type ScenarioLoader<T> = (draft: ScenarioDraft) => Promise<T>

/**
 * Resolve the data mode once for the whole app. An invalid or malformed value
 * falls back to `http`, so a misconfigured build can never enable fixtures.
 */
function readDataMode(): DataMode {
  try {
    return resolveDataMode(import.meta.env.VITE_DATA_MODE, import.meta.env.DEV)
  } catch {
    return 'http'
  }
}

export const dataMode: DataMode = readDataMode()

const apiBaseUrl = parseEnvironment(import.meta.env).apiBaseUrl
const httpClient = createHttpClient(apiBaseUrl)

/**
 * Fixture repositories are imported lazily: their synthetic artwork is never
 * bundled into a production build, and they refuse to load outside development.
 */
async function loadSimulationFixture(): Promise<SimulationPreview> {
  const { createFixturePreviewRepository } = await import(
    '@/features/simulation/infrastructure/repositories/FixturePreviewRepository'
  )
  return createFixturePreviewRepository().load()
}

async function loadPlanningFixture(): Promise<PlanningPreview> {
  const { createFixturePreviewRepository } = await import(
    '@/features/ai-planning/infrastructure/repositories/FixturePreviewRepository'
  )
  return createFixturePreviewRepository().load()
}

async function loadReplanningFixture(): Promise<ReplanningPreview> {
  const { createFixturePreviewRepository } = await import(
    '@/features/replanning/infrastructure/repositories/FixturePreviewRepository'
  )
  return createFixturePreviewRepository().load()
}

async function loadBenchmarkFixture(): Promise<BenchmarkPreview> {
  const { createFixturePreviewRepository } = await import(
    '@/features/benchmark/infrastructure/repositories/FixturePreviewRepository'
  )
  return createFixturePreviewRepository().load()
}

const thermalPreview: ScenarioLoader<ThermalPreview> = async (draft) => {
  if (dataMode === 'fixture') {
    const { createFixturePreviewRepository } = await import('@/features/thermal-profile/infrastructure/repositories/FixturePreviewRepository')
    return createFixturePreviewRepository().load()
  }
  const window = await loadSourceWindow(httpClient)
  const result = mapThermalWindow({ ...window, points: window.points.map(point => ({
    ...point, temperature_c: draft.sourceTemperatureC ?? point.temperature_c,
    available_heat_kw: draft.availableHeatKw ?? point.available_heat_kw,
  })) })
  return { ...result, provenance: { ...result.provenance, detail: draft.sourceTemperatureC === undefined ? 'SYNTHETIC INPUT: backend demo source. Not measured.' : 'MANUAL INPUT: operator-entered source applied to the backend time window. Not a verified measurement.' } }
}

/**
 * The single composition root for the workspace pages. HTTP loaders POST the
 * scenario the operator is editing; the client fails closed with
 * `unconfigured` when no base URL is set, so a missing backend never invents
 * data. Fixture mode stays available for UI preview only.
 */
export const previewServices = {
  thermal: thermalPreview,
  simulation: ((draft) =>
    dataMode === 'fixture'
      ? loadSimulationFixture()
      : loadScenarioSimulation(httpClient, draft)) satisfies ScenarioLoader<SimulationPreview>,
  planning: ((draft) =>
    dataMode === 'fixture'
      ? loadPlanningFixture()
      : loadScenarioPlan(httpClient, draft)) satisfies ScenarioLoader<PlanningPreview>,
  benchmark: ((draft) =>
    dataMode === 'fixture'
      ? loadBenchmarkFixture()
      : loadScenarioBenchmark(httpClient, draft)) satisfies ScenarioLoader<BenchmarkPreview>,
} satisfies Record<string, unknown>

/** Replanning asks the backend for a specific changed temperature. */
export const replanService = (
  draft: ScenarioDraft,
  temperatureC: number,
): Promise<ReplanningPreview> =>
  dataMode === 'fixture'
    ? loadReplanningFixture()
    : createReplanPreview(httpClient, draft)(temperatureC)

/**
 * The batch form always asks the real engine: its result is labelled as a model
 * prediction, and it fails closed when no backend is reachable.
 */
export const batchMassBalance = createBatchMassBalance(httpClient)
