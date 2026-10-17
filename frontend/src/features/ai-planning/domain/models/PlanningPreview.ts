export interface PlanningPreview {
  source: 'synthetic'
  options: { name: string; description: string }[]
  status: 'NEED_MORE_DATA'
  steps: string[]
}
