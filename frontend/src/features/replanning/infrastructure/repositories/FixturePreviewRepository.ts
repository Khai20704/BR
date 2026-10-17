import type { PreviewRepository } from '../../domain/repositories/PreviewRepository'
// Static UI artwork data, never a physical model or an execution result.
export function createFixturePreviewRepository(): PreviewRepository {
  return {
    async load() {
      if (!import.meta.env.DEV)
        throw new Error('Preview fixtures are disabled in production.')
      return {
        source: 'synthetic',
        status: 'NOT_VALIDATED',
        reasonCodes: [
          'THERMAL_INPUT_CHANGED',
          'MODEL_NOT_CONNECTED',
          'VALIDATION_REQUIRED',
        ],
      }
    },
  }
}
