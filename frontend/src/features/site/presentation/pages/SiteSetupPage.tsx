import { Building2, Radio, Thermometer } from 'lucide-react'
import { z } from 'zod'
import { DraftForm } from '@/shared/components/DraftForm'
import { Badge, Notice, PageHeader, Panel } from '@/shared/components/ui'
import { useDraftReview } from '@/shared/hooks/useDraftReview'
const positive = z.coerce.number().positive('Enter a value greater than zero.')
const schema = z.object({
  name: z.string().trim().min(2, 'Enter at least 2 characters.'),
  location: z.string().trim().min(2, 'Enter a site location.'),
  acModel: z.string().trim().min(2, 'Enter an AC model.'),
  capacity: positive,
  source: z.string().min(1),
  provenance: z.enum([
    'Synthetic / UI preview',
    'Measured · verification pending',
  ]),
})
export function SiteSetupPage() {
  const { review } = useDraftReview()
  return (
    <>
      <PageHeader
        eyebrow="WORKSPACE / CONFIGURATION"
        title="Site setup"
        description="Define the source. Understand the heat you have."
      />
      <div className="two-column">
        <Panel
          title="Site & equipment"
          subtitle="The foundation of your thermal workspace"
          action={<Building2 size={19} />}
        >
          <DraftForm
            schema={schema}
            onReview={review}
            initialValues={{
              name: '',
              location: '',
              acModel: '',
              capacity: '',
              source: 'AC condenser waste heat',
              provenance: 'Synthetic / UI preview',
            }}
            fields={[
              {
                name: 'name',
                label: 'Site name',
                placeholder: 'e.g. District 02 Roastery',
              },
              {
                name: 'location',
                label: 'Location',
                placeholder: 'City, facility or zone',
              },
              {
                name: 'acModel',
                label: 'AC model / asset ID',
                placeholder: 'Manufacturer and model',
              },
              {
                name: 'capacity',
                label: 'Rated cooling capacity',
                unit: 'kW',
                type: 'number',
                placeholder: 'Enter nameplate value',
                help: 'Equipment metadata only; not recoverable heat.',
              },
              {
                name: 'source',
                label: 'Thermal source',
                options: [
                  'AC condenser waste heat',
                  'Other low-grade waste heat',
                ],
              },
              {
                name: 'provenance',
                label: 'Declared data source',
                options: [
                  'Synthetic / UI preview',
                  'Measured · verification pending',
                ],
                help: 'A declaration does not verify measurement provenance.',
              },
            ]}
          />
        </Panel>
        <div className="stack">
          <Panel title="Source integrity" action={<Radio size={18} />}>
            <Badge tone="amber">NO VERIFIED MEASUREMENTS</Badge>
            <p className="body-copy">
              Measured observations and synthetic scenarios are kept distinct.
              No connected sensor stream is available.
            </p>
            <div className="info-row">
              <span>Sensor connection</span>
              <span>Disconnected</span>
            </div>
            <div className="info-row">
              <span>Calibration</span>
              <span>Not provided</span>
            </div>
            <div className="info-row">
              <span>Sampling interval</span>
              <span>Not provided</span>
            </div>
          </Panel>
          <Panel
            title="Low-grade heat, new potential"
            action={<Thermometer size={18} />}
          >
            <p className="body-copy">
              Capture the context around your waste-heat source before designing
              a drying scenario.
            </p>
            <Notice>
              No hardware is connected or controlled by this interface.
            </Notice>
          </Panel>
        </div>
      </div>
    </>
  )
}
