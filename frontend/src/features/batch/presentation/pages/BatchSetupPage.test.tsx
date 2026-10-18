import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { ScenarioProvider } from '@/core/scenario/ScenarioProvider'
import { BatchSetupPage } from './BatchSetupPage'

const VALID_RESULT = {
  drySolidsKg: 4.56,
  waterToRemoveKg: 5.987,
  finalMassKg: 6.013,
  minimumEnergyKwh: 1.2,
  provenance: {
    kind: 'MODEL_PREDICTION' as const,
    label: 'MODEL_PREDICTION',
    detail: 'Model prediction.',
    modelVersion: 'thin-layer-1.0',
  },
}

it('requires numeric inputs, rejects contradictory moisture and asks the engine for a valid draft', async () => {
  const computeMassBalance = vi.fn().mockResolvedValue(VALID_RESULT)
  render(
    <ScenarioProvider>
      <BatchSetupPage computeMassBalance={computeMassBalance} />
    </ScenarioProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Review draft' }))
  expect(screen.getAllByText('This value is required.').length).toBe(4)
  fireEvent.change(screen.getByLabelText(/Mass after pressing/), {
    target: { value: '12' },
  })
  fireEvent.change(screen.getByLabelText(/Initial moisture/), {
    target: { value: '62' },
  })
  fireEvent.change(screen.getByLabelText(/Target moisture/), {
    target: { value: '70' },
  })
  fireEvent.change(screen.getByLabelText(/Maximum duration/), {
    target: { value: '8' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Review draft' }))
  expect(
    screen.getByText('Target moisture must be lower than initial moisture.'),
  ).toBeInTheDocument()
  expect(computeMassBalance).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText(/Target moisture/), {
    target: { value: '12' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Review draft' }))
  expect(await screen.findByRole('status')).toHaveTextContent(
    'Engine returned the water duty',
  )
  expect(computeMassBalance).toHaveBeenCalledOnce()
  expect(computeMassBalance).toHaveBeenCalledWith({
    massKg: 12,
    initialMoisturePercentWb: 62,
    targetMoisturePercentWb: 12,
    durationHours: 8,
  })
})
