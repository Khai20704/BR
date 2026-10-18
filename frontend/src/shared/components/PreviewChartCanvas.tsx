import { useId } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from 'recharts'
import { PreviewLabel } from './ui'
export interface ChartPoint {
  time: string | number
  value: number | null
  comparison?: number | null
}
export function PreviewChart({
  points,
  label,
  unit,
  color = '#3cddaf',
  provenanceLabel,
  target,
  comparisonLabel,
  xAxisLabel,
  yAxisLabel,
}: {
  points: ChartPoint[]
  label: string
  unit: string
  color?: string
  provenanceLabel?: string
  target?: number
  comparisonLabel?: string
  xAxisLabel?: string
  yAxisLabel?: string
}) {
  const id = useId().replaceAll(':', '')
  return (
    <div className="preview-chart">
      <div className="chart-caption">
        <span>
          <i style={{ background: color }} />
          {label} <span className="muted">({unit})</span>
        </span>
        {provenanceLabel ? (
          <span className="muted">{provenanceLabel}</span>
        ) : (
          <PreviewLabel />
        )}
      </div>
      <div
        className="chart-frame"
        role="img"
        aria-label={
          label +
          ' · ' +
          (provenanceLabel ??
            'synthetic UI preview, not an engineering prediction')
        }
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 600, height: 240 }}
        >
          <AreaChart
            data={points}
            margin={{
              top: 18,
              right: 18,
              left: yAxisLabel ? 20 : -20,
              bottom: xAxisLabel ? 25 : 0,
            }}
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
              type={xAxisLabel ? 'number' : 'category'}
              domain={xAxisLabel ? ['dataMin', 'dataMax'] : undefined}
              label={
                xAxisLabel
                  ? {
                      value: xAxisLabel,
                      position: 'insideBottom',
                      offset: -15,
                      fill: '#aabdb6',
                    }
                  : undefined
              }
            />
            <YAxis
              stroke="#81918f"
              tickLine={false}
              axisLine={false}
              fontSize={11}
              domain={target !== undefined ? [0, 100] : undefined}
              label={
                yAxisLabel
                  ? {
                      value: yAxisLabel,
                      angle: -90,
                      position: 'insideLeft',
                      offset: -8,
                      fill: '#aabdb6',
                    }
                  : undefined
              }
            />
            <Tooltip
              contentStyle={{
                background: '#162126',
                border: '1px solid #354540',
                borderRadius: 8,
                color: '#e4eeeb',
              }}
              formatter={(value, name) => [
                String(value) + ' ' + unit,
                name === 'comparison' ? comparisonLabel : label,
              ]}
              labelFormatter={(value) =>
                xAxisLabel ? `${value} minutes` : String(value)
              }
            />
            <Area
              type="linear"
              dataKey="value"
              stroke={color}
              strokeWidth={2.5}
              fill={'url(#' + id + ')'}
              isAnimationActive={false}
              connectNulls
            />
            {comparisonLabel && (
              <Area
                type="linear"
                dataKey="comparison"
                stroke="#f2b47e"
                strokeWidth={2.5}
                fill="transparent"
                isAnimationActive={false}
                connectNulls
              />
            )}
            {target !== undefined && (
              <ReferenceLine
                y={target}
                stroke="#b4c8bf"
                strokeDasharray="5 4"
                label={{
                  value: `Target ${target}%`,
                  fill: '#cbdad4',
                  position: 'insideTopRight',
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <details className="chart-data">
        <summary>
          {provenanceLabel
            ? 'View prediction data table'
            : 'View preview data table'}
        </summary>
        <table>
          <caption>
            {label} · {provenanceLabel ?? 'SYNTHETIC / UI PREVIEW'}
          </caption>
          <thead>
            <tr>
              <th>Time</th>
              <th>
                {label} ({unit})
              </th>
              {comparisonLabel && (
                <th>
                  {comparisonLabel} ({unit})
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.time}>
                <td>{p.time}</td>
                <td>{p.value ?? 'Not sampled'}</td>
                {comparisonLabel && <td>{p.comparison ?? 'Not sampled'}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
