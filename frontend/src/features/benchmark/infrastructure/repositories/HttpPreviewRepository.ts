import type { AxiosInstance } from 'axios'
import {
  benchmarkSnapshotSchema,
  type BenchmarkSnapshotPayload,
} from '@/core/api/backend-schemas'
import { toPlanStatus } from '@/core/preview/plan-types'
import { modelPredictionProvenance } from '@/core/provenance/Provenance'
import type { ScenarioDraft } from '@/core/scenario/scenario-draft'
import { postScenario } from '@/core/scenario/scenario-gateway'
import type { BenchmarkPreview } from '../../domain/models/BenchmarkPreview'
import type { PreviewRepository } from '../../domain/repositories/PreviewRepository'

export const BENCHMARK_PATH = '/api/v1/benchmark'

export function mapBenchmark(
  payload: BenchmarkSnapshotPayload,
): BenchmarkPreview {
  return {
    provenance: modelPredictionProvenance(payload.model_version),
    scenarioId: payload.scenario_id,
    modelVersion: payload.model_version,
    methods: payload.methods.map((method) => ({
      method: method.method,
      status: toPlanStatus(method.status),
      durationMinutes: method.duration_minutes,
      energyKwh: method.energy_kwh,
      finalMoisturePercentWb: method.final_moisture_percent_wb,
      validated: method.validated,
      note: method.note,
    })),
    notes: payload.notes,
  }
}

/**
 * Compare all three methods on the entered scenario. Every method is integrated
 * and validated by the same backend engine, so the comparison is not a claim of
 * measured savings.
 */
export async function loadScenarioBenchmark(
  client: AxiosInstance,
  draft: ScenarioDraft,
): Promise<BenchmarkPreview> {
  const payload = await postScenario({
    client,
    path: BENCHMARK_PATH,
    schema: benchmarkSnapshotSchema,
    featureLabel: 'benchmark',
    draft,
  })
  return mapBenchmark(payload)
}

export function createHttpPreviewRepository(
  client: AxiosInstance,
  draft: ScenarioDraft,
): PreviewRepository {
  return {
    load: () => loadScenarioBenchmark(client, draft),
  }
}
