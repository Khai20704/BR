import type { PreviewRepository } from '../../domain/repositories/PreviewRepository'
import { range } from '@/core/preview/format'
import { syntheticProvenance } from '@/core/provenance/Provenance'

const POINTS = [
  { time: '08:00', temperature: 34, heat: 1.2 },
  { time: '09:00', temperature: 38, heat: 1.8 },
  { time: '10:00', temperature: 43, heat: 2.4 },
  { time: '11:00', temperature: 46, heat: 2.7 },
  { time: '12:00', temperature: 44, heat: 2.5 },
  { time: '13:00', temperature: 48, heat: 3.1 },
  { time: '14:00', temperature: 45, heat: 2.8 },
  { time: '15:00', temperature: 42, heat: 2.2 },
  { time: '16:00', temperature: 39, heat: 1.7 },
]

// Static UI artwork data, never a physical model or an execution result.
export function createFixturePreviewRepository(): PreviewRepository {
  return {
    async load() {
      if (!import.meta.env.DEV)
        throw new Error('Preview fixtures are disabled in production.')
      return {
        provenance: syntheticProvenance(
          'Fixed interface curve. Not a measurement, forecast or estimate.',
        ),
        sourceId: 'fixture-source',
        sourceName: 'AC condenser waste heat',
        points: POINTS,
        uncertainty: 'Unquantified · sensor calibration required',
        temperatureRange: range(POINTS.map((point) => point.temperature)),
        heatRange: range(POINTS.map((point) => point.heat)),
      }
    },
  }
}
