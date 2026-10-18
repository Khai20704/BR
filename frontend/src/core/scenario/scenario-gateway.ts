import { getRecorder } from '@/core/workspace/recording'
import type { AxiosInstance } from 'axios'
import type { z } from 'zod'
import { requestBackend } from '@/core/api/request-backend'
import {
  thermalWindowSchema,
  type ThermalWindowPayload,
} from '@/core/api/backend-schemas'
import {
  buildScenarioBody,
  type ScenarioDraft,
  type ScenarioRequestBody,
} from './scenario-draft'

export const SOURCE_WINDOW_PATH = '/api/v1/workspace/thermal-window'

/** The documented waste-heat window; the only source every request shares. */
export async function loadSourceWindow(
  client: AxiosInstance,
): Promise<ThermalWindowPayload> {
  return requestBackend({
    client,
    path: SOURCE_WINDOW_PATH,
    schema: thermalWindowSchema,
    featureLabel: 'source window',
  })
}

/**
 * POST one engineering request for the scenario currently being edited.
 *
 * The source window is always read from the backend first, so a batch is never
 * paired with heat data invented by the browser. `extra` carries endpoint
 * specific fields such as the replan temperature.
 */
export async function postScenario<T>(options: {
  readonly client: AxiosInstance
  readonly path: string
  readonly schema: z.ZodType<T>
  readonly featureLabel: string
  readonly draft: ScenarioDraft
  readonly extra?: Record<string, unknown>
  readonly signal?: AbortSignal
}): Promise<T> {
  const { client, path, schema, featureLabel, draft, extra, signal } = options
  const record = getRecorder()
  const window = await loadSourceWindow(client)
  const body: ScenarioRequestBody & Record<string, unknown> = {
    ...buildScenarioBody(draft, window),
    ...extra,
  }
  const result = await requestBackend({
    client,
    path,
    method: 'POST',
    body,
    schema,
    featureLabel,
    signal,
  })
  if (record) void record(path, body, result, draft)
  return result
}
