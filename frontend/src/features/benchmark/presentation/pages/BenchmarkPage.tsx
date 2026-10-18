import { z } from 'zod'
import { BarChart3 } from 'lucide-react'
import type { BenchmarkPreview } from '../../domain/models/BenchmarkPreview'
import type { ScenarioDraft } from '@/core/scenario/scenario-draft'
import { useScenario } from '@/core/scenario/ScenarioProvider'
import { usePreviewQuery } from '@/shared/hooks/usePreviewQuery'
import { DraftForm } from '@/shared/components/DraftForm'
import { formatMeasurement } from '@/core/preview/format'
import {
  Notice,
  PageHeader,
  Panel,
  ProvenanceTag,
  RequestState,
  Status,
} from '@/shared/components/ui'

const schema = z.object({
  scenario: z.string().trim().min(2, 'Name the shared scenario.'),
  mass: z.coerce.number().positive('Enter a positive mass.'),
  window: z.coerce.number().positive('Enter a positive duration.'),
})

const METRICS: {
  label: string
  render: (data: BenchmarkPreview, methodIndex: number) => string
}[] = [
  {
    label: 'Drying duration (h)',
    render: (data, i) => {
      const minutes = data.methods[i]?.durationMinutes
      return minutes === null || minutes === undefined
        ? '·'
        : (minutes / 60).toFixed(2)
    },
  },
  {
    label: 'Energy consumed (kWh)',
    render: (data, i) =>
      formatMeasurement(data.methods[i]?.energyKwh ?? null, '', 3).trim(),
  },
  {
    label: 'Final moisture (% wet-basis)',
    render: (data, i) =>
      formatMeasurement(
        data.methods[i]?.finalMoisturePercentWb ?? null,
        '',
        2,
      ).trim(),
  },
]

export function BenchmarkPage({
  load,
}: {
  load: (draft: ScenarioDraft) => Promise<BenchmarkPreview>
}) {
  const { draft, revision, applyBatch } = useScenario()
  const q = usePreviewQuery('benchmark', () => load(draft), revision)
  const data = q.data

  // Reviewing the shared scenario sends it to the store, so the comparison is
  // recomputed for the entered mass and window rather than the demo defaults.
  async function review(values: Record<string, unknown>) {
    const parsed = values as { mass: number; window: number }
    await applyBatch({
      massKg: parsed.mass,
      initialMoisturePercentWb: draft.initialMoisturePercentWb,
      targetMoisturePercentWb: draft.targetMoisturePercentWb,
      maxDurationMinutes: Math.max(1, Math.round(parsed.window * 60)),
    })
  }
  return (
    <>
      <PageHeader
        eyebrow="DECISION INTELLIGENCE / COMPARISON"
        title="Benchmark"
        description="One scenario. Three approaches. An honest comparison."
        action={data ? <ProvenanceTag provenance={data.provenance} /> : <BarChart3 size={23} />}
      />
      <RequestState
        pending={q.isPending}
        error={q.error}
        retry={() => void q.refetch()}
      />
      <Panel
        title="Common scenario"
        subtitle="Shared inputs for all methods · sent to the backend"
      >
        <DraftForm
          schema={schema}
          onReview={review}
          initialValues={{ scenario: '', mass: '', window: '' }}
          fields={[
            {
              name: 'scenario',
              label: 'Scenario name',
              placeholder: 'e.g. Variable afternoon heat',
            },
            {
              name: 'mass',
              label: 'Pressed batch mass',
              type: 'number',
              unit: 'kg',
              placeholder: '12',
            },
            {
              name: 'window',
              label: 'Operating window',
              type: 'number',
              unit: 'hours',
              placeholder: '8',
            },
          ]}
        />
      </Panel>
      <Panel
        className="section-gap"
        title="Method comparison"
        subtitle={
          data
            ? `Scenario ${data.scenarioId} · ${data.modelVersion} · shared engine`
            : 'No benchmark has run. Metrics are intentionally unavailable.'
        }
        action={data ? <ProvenanceTag provenance={data.provenance} /> : <Status value="NEED_MORE_DATA" />}
      >
        <div className="table-scroll">
          <table className="benchmark-table">
            <thead>
              <tr>
                <th>Evaluation metric</th>
                {(
                  data?.methods.map((m) => m.method) ?? [
                    'Fixed schedule',
                    'Conventional adaptive',
                    'Br AI',
                  ]
                ).map((m) => (
                  <th key={m}>
                    {m === 'Br AI' && <span className="tiny-mark">Br</span>}
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRICS.map((metric) => (
                <tr key={metric.label}>
                  <th>{metric.label}</th>
                  {[0, 1, 2].map((index) => (
                    <td key={index}>
                      {data ? metric.render(data, index) : '·'}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th>Validation state</th>
                {[0, 1, 2].map((index) => (
                  <td key={index}>
                    <Status value={data?.methods[index]?.status ?? 'NOT_VALIDATED'} />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        {data && data.notes.length > 0 ? (
          <Notice>{data.notes.join(' ')}</Notice>
        ) : (
          <Notice>
            There is no evidence of savings or performance improvement yet.
          </Notice>
        )}
      </Panel>
    </>
  )
}
