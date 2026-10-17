import type { SimulationPreview } from '../models/SimulationPreview'
export interface PreviewRepository {
  load(): Promise<SimulationPreview>
}
