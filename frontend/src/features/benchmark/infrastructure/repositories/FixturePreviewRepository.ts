import type { PreviewRepository } from '../../domain/repositories/PreviewRepository'
import { syntheticProvenance } from '@/core/provenance/Provenance'

// Static UI artwork data, never a physical model or an execution result.
export function createFixturePreviewRepository(): PreviewRepository {
  return {
    async load() {
      if (!import.meta.env.DEV)
        throw new Error('Preview fixtures are disabled in production.')
      return {
        provenance: syntheticProvenance(
          'Illustrative comparison layout. No benchmark has run.',
        ),
        scenarioId: 'fixture-scenario',
        modelVersion: 'synthetic-preview',
        methods: ['Fixed schedule', 'Conventional adaptive', 'Br AI'].map(
          (method) => ({
            method,
            status: 'NOT_VALIDATED' as const,
            durationMinutes: null,
            energyKwh: null,
            finalMoisturePercentWb: null,
            validated: false,
            note: 'No benchmark has run for this method.',
          }),
        ),
        notes: [
          'Synthetic preview: no engine ran, so no metric is available.',
        ],
      }
    },
  }
}
