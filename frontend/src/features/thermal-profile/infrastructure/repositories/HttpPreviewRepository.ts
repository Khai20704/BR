import type { AxiosInstance } from 'axios'
import { requestBackend } from '@/core/api/request-backend'
import {
  thermalWindowSchema,
  type ThermalWindowPayload,
} from '@/core/api/backend-schemas'
import { formatMinute, range } from '@/core/preview/format'
import { scenarioInputProvenance } from '@/core/provenance/Provenance'
import type { ThermalPreview } from '../../domain/models/ThermalPreview'
import type { PreviewRepository } from '../../domain/repositories/PreviewRepository'

export const THERMAL_WINDOW_PATH = '/api/v1/workspace/thermal-window'

/** Map the backend's documented source window onto the thermal DTO. */
export function mapThermalWindow(payload: ThermalWindowPayload): ThermalPreview {
  const points = payload.points.map((point) => ({
    time: formatMinute(point.minute),
    temperature: point.temperature_c,
    heat: point.available_heat_kw,
  }))
  return {
    provenance: scenarioInputProvenance(payload.provenance.model_version),
    sourceId: payload.source_id,
    sourceName: payload.name,
    points,
    uncertainty: 'No uncertainty model is published by the backend.',
    temperatureRange: range(points.map((point) => point.temperature)),
    heatRange: range(points.map((point) => point.heat)),
  }
}

export function createHttpPreviewRepository(
  client: AxiosInstance,
): PreviewRepository {
  return {
    async load() {
      const payload = await requestBackend({
        client,
        path: THERMAL_WINDOW_PATH,
        schema: thermalWindowSchema,
        featureLabel: 'thermal profile',
      })
      return mapThermalWindow(payload)
    },
  }
}
