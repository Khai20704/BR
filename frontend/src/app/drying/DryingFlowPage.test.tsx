import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { expect, it, vi } from 'vitest'
import { ScenarioProvider } from '@/core/scenario/ScenarioProvider'
import { DOCUMENTED_DRAFT } from '@/core/scenario/scenario-draft'
import type { SimulationPayload } from '@/core/api/backend-schemas'
import { DryingFlowPage } from './DryingFlowPage'
import { WhatIfSimulation } from './WhatIfSimulation'
import type { DryingServices, DryingRun } from './types'
vi.mock('@/shared/components/PreviewChart', () => ({
  PreviewChart: () => <div role="img" aria-label="Prediction chart" />,
}))

const original: SimulationPayload = {
  final_moisture_percent_wb: 24.91,
  duration_minutes: 410,
  water_removed_kg: 5.9,
  energy_kwh: 7,
  minimum_energy_kwh: 3,
  model_version: 'thin-layer-1.0',
  notes: [],
  points: [
    {
      minute: 410,
      moisture_percent_wb: 24.91,
      temperature_c: 42,
      water_removed_kg: 5.9,
      energy_kwh: 7,
    },
  ],
  target_achieved: true,
  validation: {
    status: 'VALIDATED',
    summary: 'All checks passed',
    checks: [
      { code: 'TARGET_ACHIEVED_INDEPENDENTLY', passed: true, detail: 'Passed' },
    ],
  },
}
function services() {
  return {
    replan: vi
      .fn()
      .mockRejectedValue(new Error('Additional replanning unavailable')),
    simulate: vi.fn().mockResolvedValue(original),
    plan: vi.fn().mockRejectedValue(new Error('Gemini service unavailable')),
    massBalance: vi
      .fn()
      .mockRejectedValue(new Error('Mass balance unavailable')),
    benchmark: vi.fn(),
  } satisfies DryingServices
}
const baseline: DryingRun = {
  draft: { ...DOCUMENTED_DRAFT, sourceTemperatureC: 42, availableHeatKw: 2 },
  simulation: original,
  plan: null,
  planError: '',
  balance: null,
  balanceError: '',
}

it('validates batch inputs, then renders the real response despite a recommendation failure', async () => {
  const api = services()
  render(
    <MemoryRouter>
      <ScenarioProvider>
        <DryingFlowPage services={api} />
      </ScenarioProvider>
    </MemoryRouter>,
  )
  fireEvent.change(screen.getByLabelText(/Target moisture/), {
    target: { value: '70' },
  })
  fireEvent.click(
    screen.getByRole('button', { name: 'Generate AI Drying Plan' }),
  )
  expect(
    screen.getByText('Target moisture must be lower than initial moisture.'),
  ).toBeInTheDocument()
  expect(api.simulate).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText(/Target moisture/), {
    target: { value: '25' },
  })
  fireEvent.click(
    screen.getByRole('button', { name: 'Generate AI Drying Plan' }),
  )
  expect(
    await screen.findByRole('heading', { name: 'Your AI Drying Plan' }),
  ).toBeInTheDocument()
  expect(screen.getByText('24.91')).toBeInTheDocument()
  expect(
    screen.getByText('Gemini recommendations unavailable'),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Retry recommendation' }),
  ).toBeInTheDocument()
  expect(
    screen
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent),
  ).toEqual([
    'AI Assessment',
    'Key Results',
    'AI Recommendations',
    'Moisture Prediction Chart',
    'What if your AC produces less heat?',
  ])
  const details = screen
    .getByText('View Calculation Details')
    .closest('details')!
  expect(details.open).toBe(false)
  expect(api.simulate).toHaveBeenCalledWith(
    expect.objectContaining({
      sourceTemperatureC: 42,
      availableHeatKw: 2,
      targetMoisturePercentWb: 25,
    }),
  )
})
it('changes no results on slider input and preserves the baseline through an asynchronous what-if request', async () => {
  const api = services()
  let resolve!: (value: SimulationPayload) => void
  api.simulate.mockImplementation(
    () =>
      new Promise<SimulationPayload>((r) => {
        resolve = r
      }),
  )
  const snapshot = structuredClone(baseline)
  render(<WhatIfSimulation baseline={baseline} services={api} />)
  fireEvent.change(screen.getByRole('slider'), { target: { value: '35' } })
  expect(api.simulate).not.toHaveBeenCalled()
  expect(screen.queryByText('Before vs. After')).not.toBeInTheDocument()
  fireEvent.click(
    screen.getByRole('button', { name: 'Run What-If Simulation' }),
  )
  expect(
    screen.getByRole('button', { name: 'Running What-If Simulation…' }),
  ).toBeDisabled()
  expect(api.simulate).toHaveBeenCalledWith({
    ...baseline.draft,
    sourceTemperatureC: 35,
  })
  await act(async () =>
    resolve({
      ...original,
      duration_minutes: 480,
      final_moisture_percent_wb: 36.12,
      target_achieved: false,
    }),
  )
  expect(await screen.findByTestId('before-moisture')).toHaveTextContent(
    '24.91%',
  )
  expect(screen.getByTestId('after-moisture')).toHaveTextContent('36.12%')
  expect(baseline).toEqual(snapshot)
  fireEvent.change(screen.getByRole('slider'), { target: { value: '34' } })
  expect(screen.queryByText('Before vs. After')).not.toBeInTheDocument()
  expect(api.simulate).toHaveBeenCalledTimes(1)
})
it('shows an API failure and retries the same cooler inputs', async () => {
  const api = services()
  api.simulate.mockRejectedValueOnce(new Error('Temporary failure'))
  render(<WhatIfSimulation baseline={baseline} services={api} />)
  fireEvent.click(
    screen.getByRole('button', { name: 'Run What-If Simulation' }),
  )
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Temporary failure',
  )
  fireEvent.click(
    screen.getByRole('button', { name: 'Retry What-If Simulation' }),
  )
  await waitFor(() =>
    expect(screen.getByTestId('after-moisture')).toHaveTextContent('24.91%'),
  )
  expect(api.simulate.mock.calls[0]).toEqual(api.simulate.mock.calls[1])
})
it('rejects a source temperature outside active drying constraints', () => {
  const api = services()
  render(
    <WhatIfSimulation
      baseline={{
        ...baseline,
        draft: { ...baseline.draft, minTemperatureC: 38 },
      }}
      services={api}
    />,
  )
  fireEvent.change(screen.getByRole('slider'), { target: { value: '35' } })
  expect(
    screen.getByRole('button', { name: 'Run What-If Simulation' }),
  ).toBeDisabled()
  expect(
    screen.getByText(/below your minimum drying temperature/),
  ).toBeInTheDocument()
  expect(api.simulate).not.toHaveBeenCalled()
})
