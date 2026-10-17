import type { PreviewRepository } from '../../domain/repositories/PreviewRepository'
// Static UI artwork data, never a physical model or an execution result.
export function createFixturePreviewRepository(): PreviewRepository {
  return {
    async load() {
      if (!import.meta.env.DEV)
        throw new Error('Preview fixtures are disabled in production.')
      return {
        source: 'synthetic',
        points: [
          { time: '08:00', temperature: 34, heat: 1.2 },
          { time: '09:00', temperature: 38, heat: 1.8 },
          { time: '10:00', temperature: 43, heat: 2.4 },
          { time: '11:00', temperature: 46, heat: 2.7 },
          { time: '12:00', temperature: 44, heat: 2.5 },
          { time: '13:00', temperature: 48, heat: 3.1 },
          { time: '14:00', temperature: 45, heat: 2.8 },
          { time: '15:00', temperature: 42, heat: 2.2 },
          { time: '16:00', temperature: 39, heat: 1.7 },
        ],
        uncertainty: 'Unquantified · sensor calibration required',
      }
    },
  }
}
