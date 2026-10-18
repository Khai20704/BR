import { Building2, Radio, Thermometer } from 'lucide-react'
import { z } from 'zod'
import { DraftForm } from '@/shared/components/DraftForm'
import {
  Badge,
  Notice,
  PageHeader,
  Panel,
  ProvenanceTag,
  RequestState,
} from '@/shared/components/ui'
import { useScenario } from '@/core/scenario/ScenarioProvider'
import { usePreviewQuery } from '@/shared/hooks/usePreviewQuery'
import type { ThermalPreview } from '@/features/thermal-profile/domain/models/ThermalPreview'
import { formatRange } from '@/core/preview/format'

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

export function SiteSetupPage({
  loadSource,
}: {
  loadSource: (draft: import('@/core/scenario/scenario-draft').ScenarioDraft) => Promise<ThermalPreview>
}) {
  const { draft, revision, applySource, applySite, site } = useScenario()
  const source = usePreviewQuery('site-source', () => loadSource(draft), revision)
  const data = source.data
  return (
    <>
      <PageHeader
        eyebrow="WORKSPACE / CONFIGURATION"
        title="Site setup"
        description="Define the source. Understand the heat you have."
        action={data ? <ProvenanceTag provenance={data.provenance} /> : undefined}
      />
      <RequestState
        pending={source.isPending}
        error={source.error}
        retry={() => void source.refetch()}
      />
      <Panel title="Thermal scenario" subtitle="MANUAL INPUT / saved to your private workspace">
        <DraftForm
          schema={z.object({ temperature: z.coerce.number().min(20).max(70), heat: z.coerce.number().min(0).max(10000) })}
          initialValues={{ temperature: String(draft.sourceTemperatureC ?? 42), heat: String(draft.availableHeatKw ?? 2) }}
          fields={[
            { name: 'temperature', label: 'Scenario source temperature', unit: '°C', type: 'number' },
            { name: 'heat', label: 'Recoverable heat', unit: 'kW', type: 'number' },
          ]}
          onReview={async (values) => applySource(Number(values.temperature), Number(values.heat))}
          footerNote="Applies constant temperature and heat across the backend source window"
          savedMessage="Source saved for signed-in users and applied to engine requests. Not a verified measurement."
        />
      </Panel>
      <div className="two-column">
        <Panel
          title="Site & equipment"
          subtitle="The foundation of your thermal workspace"
          action={<Building2 size={19} />}
        >
          <DraftForm
            schema={schema}
            onReview={applySite}
            onAutosave={applySite}
            footerNote="Validated edits autosave after a pause; Save now to retry"
            savedMessage="Site saved to your private workspace."
            initialValues={{
              name: site?.name ?? '',
              location: site?.location ?? '',
              acModel: site?.acModel ?? '',
              capacity: site ? String(site.capacity) : '',
              source: site?.source ?? 'AC condenser waste heat',
              provenance: site?.provenance ?? 'Synthetic / UI preview',
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
              Measured observations and the documented scenario are kept
              distinct. No connected sensor stream is available. Site name,
              location and equipment metadata are stored privately; only the
              active batch and thermal scenario are sent to the engine.
            </p>
            <div className="info-row">
              <span>Backend source</span>
              <span>{data ? `${data.sourceName} (${data.sourceId})` : '—'}</span>
            </div>
            <div className="info-row">
              <span>Source temperature</span>
              <span>
                {data && data.temperatureRange
                  ? `${formatRange(data.temperatureRange)} °C`
                  : '—'}
              </span>
            </div>
            <div className="info-row">
              <span>Available heat</span>
              <span>
                {data && data.heatRange
                  ? `${formatRange(data.heatRange, 1)} kW`
                  : '—'}
              </span>
            </div>
            <div className="info-row">
              <span>Active batch</span>
              <span>
                {draft.massKg} kg · {draft.initialMoisturePercentWb}% to{' '}
                {draft.targetMoisturePercentWb}% wet basis
              </span>
            </div>
            <div className="info-row">
              <span>Operating window</span>
              <span>{draft.maxDurationMinutes} min</span>
            </div>
            <div className="info-row">
              <span>Sensor connection</span>
              <span>Disconnected</span>
            </div>
            <div className="info-row">
              <span>Calibration</span>
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
