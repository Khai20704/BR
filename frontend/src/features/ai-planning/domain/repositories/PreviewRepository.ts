import type { PlanningPreview } from '../models/PlanningPreview'
export interface PreviewRepository {
  load(): Promise<PlanningPreview>
}
