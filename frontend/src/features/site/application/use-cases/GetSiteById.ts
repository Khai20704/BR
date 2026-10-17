import type { SiteRepository } from '../../domain/repositories/SiteRepository'
export function createGetSiteById(repository: SiteRepository) {
  return async function getSiteById(id: string, signal?: AbortSignal) {
    const normalizedId = id.trim()
    if (!normalizedId) throw new Error('Site ID is required.')
    return repository.getById(normalizedId, signal)
  }
}
