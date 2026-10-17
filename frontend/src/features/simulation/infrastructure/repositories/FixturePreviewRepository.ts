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
          { time: '0 h', moisture: 62 },
          { time: '1 h', moisture: 58 },
          { time: '2 h', moisture: 52 },
          { time: '3 h', moisture: 47 },
          { time: '4 h', moisture: 43 },
          { time: '5 h', moisture: 40 },
          { time: '6 h', moisture: 38 },
        ],
        status: 'NOT_VALIDATED',
      }
    },
  }
}
