import type { Site } from '../models/Site'
export interface SiteRepository {
  getById(id: string, signal?: AbortSignal): Promise<Site>
}
