import { Package, Droplets } from 'lucide-react'
import { z } from 'zod'
import { DraftForm } from '@/shared/components/DraftForm'
import { Badge, Notice, PageHeader, Panel } from '@/shared/components/ui'
import { useDraftReview } from '@/shared/hooks/useDraftReview'
const requiredNumber = z
  .string()
  .trim()
  .min(1, 'This value is required.')
  .pipe(z.coerce.number<string>().finite())
const schema = z
  .object({
    material: z.enum(['Spent coffee grounds']),
    mass: requiredNumber.pipe(
      z.number().positive('Mass must be greater than zero.'),
    ),
    initial: requiredNumber.pipe(z.number().gt(0).lt(100)),
    target: requiredNumber.pipe(z.number().gte(0).lt(100)),
    duration: requiredNumber.pipe(
      z.number().positive('Duration must be greater than zero.'),
    ),
  })
  .refine((v) => v.target < v.initial, {
    path: ['target'],
    message: 'Target moisture must be lower than initial moisture.',
  })
export function BatchSetupPage() {
  const { review } = useDraftReview()
  return (
    <>
      <PageHeader
        eyebrow="WORKSPACE / MATERIAL"
        title="Batch setup"
        description="Every batch starts with a well-defined material state."
      />
      <div className="two-column">
        <Panel
          title="Drying batch"
          subtitle="Specify your inputs before requesting a simulation"
          action={<Package size={19} />}
        >
          <DraftForm
            schema={schema}
            onReview={review}
            initialValues={{
              material: 'Spent coffee grounds',
              mass: '',
              initial: '',
              target: '',
              duration: '',
            }}
            fields={[
              {
                name: 'material',
                label: 'Material',
                options: ['Spent coffee grounds'],
              },
              {
                name: 'mass',
                label: 'Mass after pressing',
                unit: 'kg',
                type: 'number',
                placeholder: 'e.g. 12',
                help: 'Total wet mass after mechanical pressing.',
              },
              {
                name: 'initial',
                label: 'Initial moisture',
                unit: '% wet-basis',
                type: 'number',
                placeholder: 'e.g. 62',
              },
              {
                name: 'target',
                label: 'Target moisture',
                unit: '% wet-basis',
                type: 'number',
                placeholder: 'e.g. 12',
              },
              {
                name: 'duration',
                label: 'Maximum duration',
                unit: 'hours',
                type: 'number',
                placeholder: 'e.g. 8',
              },
            ]}
          />
        </Panel>
        <div className="stack">
          <Panel
            title="A consistent moisture basis"
            action={<Droplets size={18} />}
          >
            <Badge>WET-BASIS INPUTS</Badge>
            <p className="body-copy">
              Moisture values describe water as a percentage of total wet
              material mass. Use the same basis for initial and target values.
            </p>
            <Notice>
              Input checks validate the form, not drying feasibility or material
              safety.
            </Notice>
          </Panel>
          <Panel title="Before you simulate">
            <ul className="checklist">
              <li>Weigh after pressing</li>
              <li>Record the moisture measurement method</li>
              <li>Confirm the available operating window</li>
              <li>Provide a measured thermal profile</li>
            </ul>
          </Panel>
        </div>
      </div>
    </>
  )
}
