import { lazy, Suspense } from 'react'
import type { ChartPoint } from './PreviewChartCanvas'
const Chart = lazy(() =>
  import('./PreviewChartCanvas').then((module) => ({
    default: module.PreviewChart,
  })),
)
export function PreviewChart(props: {
  points: ChartPoint[]
  label: string
  unit: string
  color?: string
}) {
  return (
    <Suspense
      fallback={
        <div className="chart-frame" role="status">
          Loading preview chart...
        </div>
      }
    >
      <Chart {...props} />
    </Suspense>
  )
}
