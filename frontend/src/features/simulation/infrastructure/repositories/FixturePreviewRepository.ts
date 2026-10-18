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
          'Illustrative trajectory. No physics engine produced these values.',
        ),
        points: [
          { time: '0 h', moisture: 62 },
          { time: '1 h', moisture: 58 },
          { time: '2 h', moisture: 52 },
          { time: '3 h', moisture: 47 },
          { time: '4 h', moisture: 43 },
          { time: '5 h', moisture: 40 },
          { time: '6 h', moisture: 38 },
        ],
        status: 'NOT_VALIDATED',
        finalMoisturePercentWb: 38,
        durationMinutes: 360,
        waterRemovedKg: 0,
        energyKwh: 0,
        minimumEnergyKwh: 0,
        modelVersion: 'synthetic-preview',
        notes: ['Synthetic preview: no mass balance or energy was computed.'],
      }
    },
  }
}
