import { describe, expect, it } from 'vitest'
import {
  assertApprovable,
  canTransitionSpecificationRevision,
  missingApprovalFields,
} from './specification-lifecycle'

const valid = {
  nameEn: 'Shrimp',
  nameVi: 'Tôm',
  nameKo: '새우',
  grade: 'A',
  processing: 'PDTO',
  netWeightPerPack: '1',
  weightUnit: 'KG',
  packsPerCarton: 10,
  uom: 'CTN',
  packaging: 'IQF bag',
}

describe('specification revision lifecycle', () => {
  it('allows only declared lifecycle transitions', () => {
    expect(canTransitionSpecificationRevision('DRAFT', 'APPROVED')).toBe(true)
    expect(canTransitionSpecificationRevision('APPROVED', 'ARCHIVED')).toBe(
      true,
    )
    expect(canTransitionSpecificationRevision('ARCHIVED', 'DRAFT')).toBe(false)
    expect(canTransitionSpecificationRevision('UNKNOWN', 'APPROVED')).toBe(
      false,
    )
  })

  it('requires all owner-approved fields before approval', () => {
    expect(missingApprovalFields(valid)).toEqual([])
    expect(() => assertApprovable(valid)).not.toThrow()
    expect(
      missingApprovalFields({ ...valid, nameKo: '  ', packaging: null }),
    ).toEqual(['nameKo', 'packaging'])
    expect(() => assertApprovable({ ...valid, grade: null })).toThrow(/grade/)
  })
})
