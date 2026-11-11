import { describe, expect, it } from 'vitest'
import {
  canTransitionProduct,
  createProductSchema,
  productSkuSchema,
  updateProductSchema,
} from './contracts'

describe('product contracts', () => {
  it('normalizes SKU casing and rejects out-of-pattern values', () => {
    expect(productSkuSchema.parse('  sq-001 ')).toBe('SQ-001')
    expect(productSkuSchema.safeParse('a').success).toBe(false)
    expect(productSkuSchema.safeParse('bad sku!').success).toBe(false)
  })

  it('requires all three names and a valid unit on create, rejects unknown fields', () => {
    expect(
      createProductSchema.safeParse({
        sku: 'SQ-001',
        names: { en: 'Squid', vi: 'Mực', ko: '오징어' },
        defaultUnit: 'KG',
      }).success,
    ).toBe(true)
    expect(
      createProductSchema.safeParse({
        sku: 'SQ-001',
        names: { en: 'Squid', vi: 'Mực' },
        defaultUnit: 'KG',
      }).success,
    ).toBe(false)
    expect(
      createProductSchema.safeParse({
        sku: 'SQ-001',
        names: { en: 'Squid', vi: 'Mực', ko: '오징어' },
        defaultUnit: 'TONS',
      }).success,
    ).toBe(false)
    expect(
      createProductSchema.safeParse({
        sku: 'SQ-001',
        names: { en: 'Squid', vi: 'Mực', ko: '오징어' },
        defaultUnit: 'KG',
        marketId: 9,
      }).success,
    ).toBe(false)
  })

  it('requires an actual change in an update', () => {
    expect(updateProductSchema.safeParse({ version: 1 }).success).toBe(false)
    expect(
      updateProductSchema.safeParse({ version: 1, category: 'Cephalopod' })
        .success,
    ).toBe(true)
  })

  it('enforces the DRAFT/ACTIVE/INACTIVE lifecycle and rejects DRAFT -> INACTIVE', () => {
    expect(canTransitionProduct('DRAFT', 'ACTIVE')).toBe(true)
    expect(canTransitionProduct('ACTIVE', 'INACTIVE')).toBe(true)
    expect(canTransitionProduct('INACTIVE', 'ACTIVE')).toBe(true)
    expect(canTransitionProduct('DRAFT', 'INACTIVE')).toBe(false)
    expect(canTransitionProduct('ACTIVE', 'DRAFT')).toBe(false)
    expect(canTransitionProduct('UNKNOWN', 'ACTIVE')).toBe(false)
  })
})
