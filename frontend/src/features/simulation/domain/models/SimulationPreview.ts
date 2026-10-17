export interface SimulationPreview {
  source: 'synthetic'
  points: { time: string; moisture: number }[]
  status: 'NOT_VALIDATED'
}
