import { describe, expect, it } from 'vitest'
import { buildSpecificationSnapshot } from './specification-snapshot'
import { totalNetWeight } from './specification-measurements'

const revision = {
  id: 11,
  specificationId: 5,
  productId: 3,
  revisionNo: 1,
  status: 'APPROVED',
  publishedAt: '2026-11-11T00:00:00.000Z',
  approvedBy: 8,
  nameEn: 'Vannamei',
  nameVi: 'Tôm thẻ',
  nameKo: '흰다리새우',
  descriptionEn: null,
  descriptionVi: null,
  descriptionKo: null,
  grade: 'A',
  processing: 'PDTO',
  treatment: null,
  frozenForm: 'IQF',
  sizeBand: '31/40',
  sizeUnit: 'PCS/LB',
  netWeightPerPack: '1.00',
  grossWeightPerPack: '1.10',
  weightUnit: 'KG',
  packsPerCarton: 10,
  cartonNetWeight: '10.00',
  glazingPercent: '10',
  packaging: 'Bag',
  packagingMaterial: 'PE',
  uom: 'CTN',
  moq: null,
  moqUnit: null,
  storageTempC: null,
  shelfLifeMonths: null,
  originCountry: 'VN',
  certifications: [],
  labelLanguages: ['en'],
  buyerRequirements: null,
  notes: null,
  requirements: {},
}

describe('specification snapshot contract', () => {
  it('freezes the approved revision and immutable document references', () => {
    const snapshot = buildSpecificationSnapshot({
      revision,
      specification: { id: 5, code: 'SQ-001-S01', customerId: null },
      product: { id: 3, sku: 'SQ-001', names: { en: 'Squid' } },
      documents: [
        {
          fileId: 7,
          purpose: 'SPEC',
          originalName: 'spec.pdf',
          mediaType: 'application/pdf',
          byteSize: 12,
          sha256: 'a'.repeat(64),
          createdAt: '2026-11-10T00:00:00.000Z',
        },
      ],
      capturedAt: '2026-11-11T00:00:00.000Z',
    })
    expect(snapshot.cartonNetWeight).toBe('10.00')
    expect(snapshot.documents[0]).toMatchObject({
      fileId: 7,
      sha256: 'a'.repeat(64),
    })
    expect(snapshot).not.toHaveProperty('storageKey')
    expect(Object.isFrozen(snapshot)).toBe(true)
    expect(Object.isFrozen(snapshot.documents[0])).toBe(true)
  })

  it('calculates 10 cartons × 10 kg without unit conversion', () => {
    expect(
      totalNetWeight({ cartons: 10, cartonNetWeight: '10', weightUnit: 'KG' }),
    ).toEqual({ amount: '100', unit: 'KG' })
  })
})
