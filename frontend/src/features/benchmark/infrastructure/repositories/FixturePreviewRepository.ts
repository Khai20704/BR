import type { PreviewRepository } from '../../domain/repositories/PreviewRepository'
// Static UI artwork data, never a physical model or an execution result.
export function createFixturePreviewRepository(): PreviewRepository {
  return {
    async load() {
      if (!import.meta.env.DEV)
        throw new Error('Preview fixtures are disabled in production.')
      return {
        source: 'synthetic',
        methods: ['Fixed schedule', 'Conventional adaptive', 'Br AI'],
        status: 'NOT_VALIDATED',
      }
    },
  }
}
