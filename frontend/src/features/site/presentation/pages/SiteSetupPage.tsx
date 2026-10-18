import { Building2 } from 'lucide-react'
import { z } from 'zod'
import { DraftForm } from '@/shared/components/DraftForm'
import { PageHeader, Panel } from '@/shared/components/ui'
import { useScenario } from '@/core/scenario/ScenarioProvider'

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your shop name.').max(120),
  location: z.string().trim().min(2, 'Enter your shop location.').max(200),
  acModel: z
    .string()
    .trim()
    .min(2, 'Enter your AC model or a short name.')
    .max(120),
  capacity: z.coerce
    .number()
    .positive('Enter a capacity greater than zero.')
    .max(100000),
  source: z.string().min(1).max(120),
  provenance: z.enum([
    'Synthetic / UI preview',
    'Measured \u00b7 verification pending',
  ]),
})

export function SiteSetupPage() {
  const { draft, applySource, applySite, site } = useScenario()
  return (
    <>
      <PageHeader
        eyebrow="YOUR COFFEE SHOP"
        title="My Shop"
        description="Save your shop and AC information once. Reuse it for your next batch."
      />
      <div className="equal-columns shop-grid">
        <Panel
          title="Shop & AC information"
          subtitle="Changes save automatically after a short pause."
          action={<Building2 size={20} />}
        >
          <DraftForm
            schema={schema}
            onReview={applySite}
            onAutosave={applySite}
            footerNote="Your shop information is private to your account."
            savedMessage="Shop information saved."
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
                label: 'Shop name',
                placeholder: 'e.g. Morning Coffee',
              },
              {
                name: 'location',
                label: 'Location',
                placeholder: 'City or neighborhood',
              },
              {
                name: 'acModel',
                label: 'AC model / name',
                placeholder: 'e.g. Main shop AC',
              },
              {
                name: 'capacity',
                label: 'Rated cooling capacity',
                unit: 'kW',
                type: 'number',
                help: 'Find this on your AC label. This is different from the heat available for drying.',
              },
              {
                name: 'source',
                label: 'Heat source',
                options: [
                  'AC condenser waste heat',
                  'Other low-grade waste heat',
                ],
              },
              {
                name: 'provenance',
                label: 'Where these values came from',
                options: [
                  'Synthetic / UI preview',
                  'Measured \u00b7 verification pending',
                ],
                optionLabels: {
                  'Synthetic / UI preview': 'Example or estimate',
                  'Measured \u00b7 verification pending':
                    'Your readings (not verified)',
                },
                help: 'Your readings remain unverified until independently checked.',
              },
            ]}
          />
        </Panel>
        <div className="stack">
          <Panel
            title="Heat available for drying"
            subtitle="Example estimates until you replace them with your own values."
          >
            <DraftForm
              schema={z.object({
                temperature: z.coerce.number().min(20).max(70),
                heat: z.coerce.number().min(0).max(10000),
              })}
              initialValues={{
                temperature: String(draft.sourceTemperatureC ?? 42),
                heat: String(draft.availableHeatKw ?? 2),
              }}
              fields={[
                {
                  name: 'temperature',
                  label: 'AC heat temperature',
                  unit: '?C',
                  type: 'number',
                  help: 'Estimated temperature of the air or heat source used for drying.',
                },
                {
                  name: 'heat',
                  label: 'Available heat',
                  unit: 'kW',
                  type: 'number',
                  help: 'Estimated heat that can be recovered from your AC.',
                },
              ]}
              onReview={async (values) =>
                applySource(Number(values.temperature), Number(values.heat))
              }
              submitLabel="Save heat estimates"
              footerNote="New batches use these starting values."
              savedMessage="Heat estimates saved. These are not verified measurements."
            />
          </Panel>
          <p className="body-copy">
            Br helps you explore a drying plan. It does not control your AC or
            dryer.
          </p>
        </div>
      </div>
    </>
  )
}
