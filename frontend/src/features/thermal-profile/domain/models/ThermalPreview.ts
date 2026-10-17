export interface ThermalPreview {
  source: 'synthetic'
  points: { time: string; temperature: number; heat: number }[]
  uncertainty: string
}
