import type { ThermalPreview } from '../models/ThermalPreview'
export interface PreviewRepository {
  load(): Promise<ThermalPreview>
}
