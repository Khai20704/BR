import type { ReplanningPreview } from '../models/ReplanningPreview'
export interface PreviewRepository {
  load(): Promise<ReplanningPreview>
}
