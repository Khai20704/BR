import type { PreviewRepository } from '../../domain/repositories/PreviewRepository'
export function createLoadPreview(repository: PreviewRepository) {
  return () => repository.load()
}
