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
          'Illustrative request outcome. No replan was computed.',
        ),
        status: 'NOT_VALIDATED',
        reasonCodes: [
          'THERMAL_INPUT_CHANGED',
          'MODEL_NOT_CONNECTED',
          'VALIDATION_REQUIRED',
        ],
        remainingMinutes: 0,
        changedTemperatureC: 0,
        phases: [],
        durationMinutes: null,
        energyKwh: null,
        finalMoisturePercentWb: null,
        narrative: {
          text: 'No replan has been calculated. This is a synthetic preview.',
          provider: 'fixture',
          verification: 'GEMINI_DISABLED',
          toolCalls: [],
          toolTrace: [],
        },
      }
    },
  }
}
