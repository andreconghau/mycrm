import { describe, expect, it } from 'vitest'
import { selectEligiblePrices, type EligibleCandidate } from './price-list-eligibility'

const base: EligibleCandidate = {
  id: 1, priceListId: 1, marketId: 7, productId: 11, specificationVersionId: null,
  unit: 'KG', currency: 'USD', priceBasis: 'NET', unitPrice: '100.00',
  minQuantity: null, maxQuantity: null, itemValidFrom: '2026-01-01T00:00:00Z', itemValidTo: null,
  listValidFrom: '2026-01-01T00:00:00Z', listValidTo: null, listStatus: 'APPROVED',
  tier: 'GENERAL', customerId: null, code: 'GEN-1',
}

const criteria = {
  marketId: 7, productId: 11, specificationVersionId: 4, customerId: 21,
  quantity: '12', unit: 'KG', currency: 'USD', at: new Date('2026-01-15T00:00:00Z'),
}

describe('eligible price selection', () => {
  it('returns every eligible reference with customer, market, general priority', () => {
    const candidates: EligibleCandidate[] = [
      { ...base, id: 3, tier: 'GENERAL' },
      { ...base, id: 2, tier: 'MARKET' },
      { ...base, id: 1, tier: 'CUSTOMER', customerId: 21 },
    ]
    const result = selectEligiblePrices(candidates, criteria)
    expect(result.options.map((option) => option.id)).toEqual([1, 2, 3])
    expect(result.suggestedItemId).toBe(1)
    expect(result.options.filter((option) => option.suggested)).toHaveLength(1)
  })

  it('applies exact/wildcard spec, currency, unit, state and inclusive quantity filters', () => {
    const candidates = [
      base,
      { ...base, id: 2, specificationVersionId: 5 },
      { ...base, id: 3, currency: 'VND' },
      { ...base, id: 4, unit: 'CTN' },
      { ...base, id: 5, listStatus: 'DRAFT' },
      { ...base, id: 6, minQuantity: '13' },
      { ...base, id: 7, maxQuantity: '11' },
      { ...base, id: 8, listValidTo: '2026-01-15T00:00:00Z' },
      { ...base, id: 9, itemValidTo: '2026-01-15T00:00:00Z' },
    ]
    expect(selectEligiblePrices(candidates, criteria).options.map((option) => option.id)).toEqual([1])
  })

  it('uses narrowest tier then latest list validity start then lowest id, never price', () => {
    const candidates = [
      { ...base, id: 4, unitPrice: '1', minQuantity: '0', maxQuantity: '100' },
      { ...base, id: 3, unitPrice: '900', minQuantity: '10', maxQuantity: '20' },
      { ...base, id: 2, unitPrice: '800', minQuantity: '10', maxQuantity: '20', listValidFrom: '2026-01-02T00:00:00Z' },
      { ...base, id: 1, unitPrice: '700', minQuantity: '10', maxQuantity: '20', listValidFrom: '2026-01-02T00:00:00Z' },
    ]
    expect(selectEligiblePrices(candidates, criteria).options.map((option) => option.id)).toEqual([1, 2, 3, 4])
  })
})
