import { useState } from 'react'
import { Package, Droplets } from 'lucide-react'
import { z } from 'zod'
import { DraftForm } from '@/shared/components/DraftForm'
import {
  Badge,
  Notice,
  PageHeader,
  Panel,
  ProvenanceTag,
  Stat,
} from '@/shared/components/ui'
import { useScenario } from '@/core/scenario/ScenarioProvider'
import type {
  BatchMassBalanceInput,
  BatchMassBalanceResult,
} from '../../infrastructure/api/BatchMassBalance'

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
    target: requiredNumber.pipe(z.number().gt(0).lt(100)),
    duration: requiredNumber.pipe(
      z.number().positive('Duration must be greater than zero.'),
    ),
  })
  .refine((v) => v.target < v.initial, {
    path: ['target'],
    message: 'Target moisture must be lower than initial moisture.',
  })

export function BatchSetupPage({
  computeMassBalance,
}: {
  computeMassBalance: (
    input: BatchMassBalanceInput,
  ) => Promise<BatchMassBalanceResult>
}) {
  const { applyBatch, draft, repository } = useScenario()
  const [result, setResult] = useState<BatchMassBalanceResult | null>(null)

  async function review(values: Record<string, unknown>) {
    const parsed = values as {
      mass: number
      initial: number
      target: number
      duration: number
    }
    // Publish the entered batch to the workspace so the thermal twin, planning,
    // replanning and benchmark pages compute this batch instead of the demo one.
    await applyBatch({
      massKg: parsed.mass,
      initialMoisturePercentWb: parsed.initial,
      targetMoisturePercentWb: parsed.target,
      maxDurationMinutes: Math.max(1, Math.round(parsed.duration * 60)),
    })
    const computed = await computeMassBalance({
      massKg: parsed.mass,
      initialMoisturePercentWb: parsed.initial,
      targetMoisturePercentWb: parsed.target,
      durationHours: parsed.duration,
    })
    setResult(computed)
  }

  return (
    <>
      <PageHeader
        eyebrow="WORKSPACE / MATERIAL"
        title="Batch setup"
        description="Every batch starts with a well-defined material state."
        action={result ? <ProvenanceTag provenance={result.provenance} /> : undefined}
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
            footerNote="Save batch and request backend mass balance"
            savedMessage="Engine returned the water duty. Batch saved for signed-in users; results are model predictions, not measurements."
            initialValues={{
              material: 'Spent coffee grounds',
              mass: repository ? String(draft.massKg) : '',
              initial: repository ? String(draft.initialMoisturePercentWb) : '',
              target: repository ? String(draft.targetMoisturePercentWb) : '',
              duration: repository ? String(draft.maxDurationMinutes / 60) : '',
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
          {result ? (
            <Panel
              title="Computed water duty"
              subtitle="Mass balance from the entered batch"
              action={<ProvenanceTag provenance={result.provenance} />}
            >
              <div className="stats-grid">
                <Stat
                  label="Dry solids"
                  value={result.drySolidsKg.toFixed(3)}
                  unit="kg"
                  detail="Conserved by the engine"
                  icon={<Package />}
                />
                <Stat
                  label="Water to remove"
                  value={result.waterToRemoveKg.toFixed(3)}
                  unit="kg"
                  detail="Initial minus final water"
                  icon={<Droplets />}
                />
              </div>
              <div className="info-row">
                <span>Final wet mass</span>
                <strong>{result.finalMassKg.toFixed(3)} kg</strong>
              </div>
              <div className="info-row">
                <span>Latent energy floor</span>
                <strong>{result.minimumEnergyKwh.toFixed(3)} kWh</strong>
              </div>
              <Notice>
                Thermodynamic minimum only. It excludes losses and is not a
                predicted energy consumption.
              </Notice>
            </Panel>
          ) : (
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
                Reviewing the draft asks the backend for the water duty. It does
                not measure your batch and does not validate drying feasibility.
              </Notice>
            </Panel>
          )}
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
