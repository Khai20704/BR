import { z } from 'zod'
import { BarChart3 } from 'lucide-react'
import type { BenchmarkPreview } from '../../domain/models/BenchmarkPreview'
import { usePreviewQuery } from '@/shared/hooks/usePreviewQuery'
import { useDraftReview } from '@/shared/hooks/useDraftReview'
import { DraftForm } from '@/shared/components/DraftForm'
import {
  Notice,
  PageHeader,
  Panel,
  PreviewLabel,
  RequestState,
  Status,
} from '@/shared/components/ui'
const schema = z.object({
  scenario: z.string().trim().min(2, 'Name the shared scenario.'),
  mass: z.coerce.number().positive('Enter a positive mass.'),
  window: z.coerce.number().positive('Enter a positive duration.'),
})
export function BenchmarkPage({
  load,
}: {
  load: () => Promise<BenchmarkPreview>
}) {
  const q = usePreviewQuery('benchmark', load)
  const { review } = useDraftReview()
  return (
    <>
      <PageHeader
        eyebrow="DECISION INTELLIGENCE / COMPARISON"
        title="Benchmark"
        description="One scenario. Three approaches. An honest comparison."
        action={<BarChart3 size={23} />}
      />
      <RequestState
        pending={q.isPending}
        error={q.error}
        retry={() => void q.refetch()}
      />
      <Panel
        title="Common scenario"
        subtitle="Shared inputs for all methods · local draft only"
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
        subtitle="No benchmark has run. Metrics are intentionally unavailable."
        action={q.data ? <PreviewLabel /> : <Status value="NEED_MORE_DATA" />}
      >
        <div className="table-scroll">
          <table className="benchmark-table">
            <thead>
              <tr>
                <th>Evaluation metric</th>
                {(
                  q.data?.methods ?? [
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
              {[
                'Drying duration (h)',
                'Energy consumed (kWh)',
                'Final moisture (% wet-basis)',
                'Constraint violations (count)',
              ].map((metric) => (
                <tr key={metric}>
                  <th>{metric}</th>
                  <td>·</td>
                  <td>·</td>
                  <td>·</td>
                </tr>
              ))}
              <tr>
                <th>Validation state</th>
                <td>
                  <Status value="NOT_VALIDATED" />
                </td>
                <td>
                  <Status value="NOT_VALIDATED" />
                </td>
                <td>
                  <Status value="NOT_VALIDATED" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Notice>
          There is no evidence of savings or performance improvement yet.
          Comparable backend runs and validated metrics are required.
        </Notice>
      </Panel>
    </>
  )
}
