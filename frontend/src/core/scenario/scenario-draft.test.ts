import { describe, expect, it } from 'vitest'
import {
  buildScenarioBody,
  DOCUMENTED_DRAFT,
  isDocumentedDraft,
} from './scenario-draft'

const window = {
  source_id: 'demo',
  name: 'Demo',
  provenance: {
    source: 'demo',
    model_version: 'thin-layer-1.0',
    is_measurement: false,
  },
  points: [
    { minute: 0, temperature_c: 34, available_heat_kw: 1.2 },
    { minute: 120, temperature_c: 43, available_heat_kw: 2.4 },
    { minute: 480, temperature_c: 38, available_heat_kw: 1.5 },
  ],
}
describe('thermal scenario API mapping', () => {
  it('uses existing contract fields with a constant synthetic horizon', () => {
    const draft = {
      ...DOCUMENTED_DRAFT,
      sourceTemperatureC: 50,
      availableHeatKw: 3,
      maxDurationMinutes: 601,
      relativeHumidity: 0.72,
    }
    const body = buildScenarioBody(draft, window)
    expect(body.profile.samples).toEqual(
      [0, 601].map((minute) => ({
        minute,
        temperature_c: 50,
        available_heat_kw: 3,
        relative_humidity: 0.72,
      })),
    )
    expect(body.constraints.max_duration_minutes).toBe(601)
    expect(body.constraints.max_relative_humidity).toBe(0.85)
    expect(body.batch.target_moisture_percent_wb).toBe(25)
  })
  it('clips a demo curve without extending its source data', () => {
    expect(
      buildScenarioBody(
        { ...DOCUMENTED_DRAFT, maxDurationMinutes: 61 },
        window,
      ).profile.samples.map((p) => p.minute),
    ).toEqual([0, 61])
    expect(
      buildScenarioBody(
        { ...DOCUMENTED_DRAFT, maxDurationMinutes: 900 },
        window,
      ).profile.samples.at(-1)?.minute,
    ).toBe(480)
  })
  it('recognizes humidity edits as synthetic user inputs', () => {
    expect(
      isDocumentedDraft({ ...DOCUMENTED_DRAFT, relativeHumidity: 0.7 }),
    ).toBe(false)
  })
})
