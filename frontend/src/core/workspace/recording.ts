import type { ScenarioDraft } from '@/core/scenario/scenario-draft'
export type Recorder = (
  path: string,
  input: unknown,
  result: unknown,
  draft: ScenarioDraft,
) => Promise<void>
let recorder: (() => Recorder) | null = null
export const getRecorder = () => recorder?.() ?? null
export function installRecorder(next: () => Recorder) {
  recorder = next
  return () => {
    if (recorder === next) recorder = null
  }
}
