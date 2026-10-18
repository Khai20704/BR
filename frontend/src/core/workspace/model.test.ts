import { expect, it } from 'vitest'
import { draftSchema, encodeSnapshot, siteSchema } from './model'
import { DOCUMENTED_DRAFT } from '@/core/scenario/scenario-draft'
it('validates persistence inputs and rejects incompatible moisture and size', () => {
  expect(draftSchema.parse(DOCUMENTED_DRAFT).massKg).toBe(12)
  expect(() => draftSchema.parse({ ...DOCUMENTED_DRAFT, massKg: -1 })).toThrow()
  expect(() =>
    draftSchema.parse({ ...DOCUMENTED_DRAFT, targetMoisturePercentWb: 80 }),
  ).toThrow()
  expect(() => siteSchema.parse({ name: 'incomplete' })).toThrow()
  expect(() => encodeSnapshot({ idToken: 'private' })).toThrow()
  expect(() => encodeSnapshot('x'.repeat(180001))).toThrow()
  expect(JSON.parse(encodeSnapshot({ energy_kwh: 7.2 }))).toEqual({
    energy_kwh: 7.2,
  })
})
