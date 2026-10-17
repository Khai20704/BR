import type { BenchmarkPreview } from '../models/BenchmarkPreview'
export interface PreviewRepository {
  load(): Promise<BenchmarkPreview>
}
