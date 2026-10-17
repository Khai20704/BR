import { useId } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PreviewLabel } from './ui'
export interface ChartPoint {
  time: string
  value: number
}
export function PreviewChart({
  points,
  label,
  unit,
  color = '#3cddaf',
}: {
  points: ChartPoint[]
  label: string
  unit: string
  color?: string
}) {
  const id = useId().replaceAll(':', '')
  return (
    <div className="preview-chart">
      <div className="chart-caption">
        <span>
          <i style={{ background: color }} />
          {label} <span className="muted">({unit})</span>
        </span>
        <PreviewLabel />
      </div>
      <div
        className="chart-frame"
        role="img"
        aria-label={
          label + ' · synthetic UI preview, not an engineering prediction'
        }
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 600, height: 240 }}
        >
          <AreaChart
            data={points}
            margin={{ top: 18, right: 12, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="#263137"
              strokeDasharray="3 5"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              stroke="#81918f"
              tickLine={false}
              axisLine={false}
              fontSize={11}
              minTickGap={20}
            />
            <YAxis
              stroke="#81918f"
              tickLine={false}
              axisLine={false}
              fontSize={11}
            />
            <Tooltip
              contentStyle={{
                background: '#162126',
                border: '1px solid #354540',
                borderRadius: 8,
                color: '#e4eeeb',
              }}
              formatter={(value) => [String(value) + ' ' + unit, label]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2.5}
              fill={'url(#' + id + ')'}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <details className="chart-data">
        <summary>View preview data table</summary>
        <table>
          <caption>{label} · SYNTHETIC / UI PREVIEW</caption>
          <thead>
            <tr>
              <th>Time</th>
              <th>
                {label} ({unit})
              </th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.time}>
                <td>{p.time}</td>
                <td>{p.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
