import { z } from 'zod'
import { DraftForm } from '@/shared/components/DraftForm'
import { Panel } from '@/shared/components/ui'
import type { ScenarioDraft } from '@/core/scenario/scenario-draft'

const number = z
  .string()
  .trim()
  .min(1, 'Enter a value.')
  .pipe(z.coerce.number<string>().finite('Enter a valid number.'))
const schema = z
  .object({
    material: z.literal('Spent coffee grounds'),
    mass: number.pipe(
      z.number().gt(0, 'Enter a mass greater than zero.').max(100000),
    ),
    initial: number.pipe(z.number().gt(0).lt(100)),
    target: number.pipe(z.number().gt(0).lt(100)),
    duration: number.pipe(
      z.number().int('Enter whole minutes.').min(1).max(10080),
    ),
    temperature: number.pipe(
      z
        .number()
        .min(20, 'Use a temperature from 20 to 70°C.')
        .max(70, 'Use a temperature from 20 to 70°C.'),
    ),
    heat: number.pipe(z.number().min(0, 'Heat cannot be negative.').max(10000)),
    minimum: number.pipe(z.number().min(0).max(200)),
    maximum: number.pipe(z.number().min(0).max(200)),
    humidity: number.pipe(z.number().min(0).max(100)),
  })
  .refine((v) => v.target < v.initial, {
    path: ['target'],
    message: 'Target moisture must be lower than initial moisture.',
  })
  .refine((v) => v.minimum < v.maximum, {
    path: ['maximum'],
    message: 'Maximum temperature must be higher than minimum temperature.',
  })

export function DryingBatchForm({
  draft,
  generate,
}: {
  draft: ScenarioDraft
  generate: (draft: ScenarioDraft) => Promise<void>
}) {
  return (
    <Panel
      title="Tell us about your batch"
      subtitle="Starting values are examples or your saved estimates. They are not verified measurements."
    >
      <DraftForm
        schema={schema}
        submitLabel="Generate AI Drying Plan"
        footerNote="Save your inputs and calculate a prediction. This may take a moment."
        onReview={async (v) =>
          generate({
            ...draft,
            batchId: crypto.randomUUID(),
            massKg: Number(v.mass),
            initialMoisturePercentWb: Number(v.initial),
            targetMoisturePercentWb: Number(v.target),
            maxDurationMinutes: Number(v.duration),
            sourceTemperatureC: Number(v.temperature),
            availableHeatKw: Number(v.heat),
            minTemperatureC: Number(v.minimum),
            maxTemperatureC: Number(v.maximum),
            relativeHumidity: Number(v.humidity) / 100,
          })
        }
        initialValues={{
          material: 'Spent coffee grounds',
          mass: String(draft.massKg),
          initial: String(draft.initialMoisturePercentWb),
          target: String(draft.targetMoisturePercentWb),
          duration: String(draft.maxDurationMinutes),
          temperature: String(draft.sourceTemperatureC ?? 42),
          heat: String(draft.availableHeatKw ?? 2),
          minimum: String(draft.minTemperatureC),
          maximum: String(draft.maxTemperatureC),
          humidity: String(Number((draft.relativeHumidity * 100).toFixed(6))),
        }}
        fields={[
          {
            name: 'material',
            label: 'Coffee grounds type',
            options: ['Spent coffee grounds'],
            help: 'This is the material currently supported by the drying model.',
          },
          {
            name: 'mass',
            label: 'Wet coffee grounds mass',
            unit: 'kg',
            type: 'number',
            help: 'Weigh the wet grounds you want to dry, after pressing if applicable.',
          },
          {
            name: 'initial',
            label: 'Initial moisture',
            unit: '% wet basis',
            type: 'number',
            help: 'How much of the wet coffee grounds is water before drying?',
          },
          {
            name: 'target',
            label: 'Target moisture',
            unit: '% wet basis',
            type: 'number',
            help: 'The moisture level you want to reach after drying.',
          },
          {
            name: 'duration',
            label: 'Maximum drying duration',
            unit: 'minutes',
            type: 'number',
            help: 'How long can this batch stay in your drying setup? Example: 480 minutes is 8 hours.',
          },
          {
            name: 'temperature',
            label: 'AC heat temperature',
            unit: '°C',
            type: 'number',
            help: 'Example: 42°C. Estimated source temperature throughout this batch; not a sensor reading.',
          },
          {
            name: 'heat',
            label: 'Available heat',
            unit: 'kW',
            type: 'number',
            help: 'Estimated heat that can be recovered from your AC. Example: 2 kW.',
          },
        ]}
        advancedFields={[
          {
            name: 'minimum',
            label: 'Minimum drying temperature',
            unit: '°C',
            type: 'number',
            help: 'Drying stops if the source falls below this limit.',
          },
          {
            name: 'maximum',
            label: 'Maximum drying temperature',
            unit: '°C',
            type: 'number',
            help: 'The model also enforces the material safety limit of 70°C.',
          },
          {
            name: 'humidity',
            label: 'Relative humidity',
            unit: '%',
            type: 'number',
            help: 'Recorded for context. Sample humidity does not affect this model; it uses a fixed maximum humidity constraint of 85%.',
          },
        ]}
      />
    </Panel>
  )
}
