import type { ScenarioDraft } from '@/core/scenario/scenario-draft'
import type {
  SimulationPayload,
  PlanEnvelopePayload,
  MassBalancePayload,
  ReplanEnvelopePayload,
} from '@/core/api/backend-schemas'
import type { BenchmarkPreview } from '@/features/benchmark/domain/models/BenchmarkPreview'

export interface DryingServices {
  replan: (
    draft: ScenarioDraft,
    temperatureC: number,
  ) => Promise<ReplanEnvelopePayload>
  simulate: (draft: ScenarioDraft) => Promise<SimulationPayload>
  plan: (draft: ScenarioDraft) => Promise<PlanEnvelopePayload>
  massBalance: (draft: ScenarioDraft) => Promise<MassBalancePayload>
  benchmark: (draft: ScenarioDraft) => Promise<BenchmarkPreview>
}
export interface DryingRun {
  draft: ScenarioDraft
  simulation: SimulationPayload
  plan: PlanEnvelopePayload | null
  planError: string
  balance: MassBalancePayload | null
  balanceError: string
}

export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'The request did not complete. Please retry.'
}
