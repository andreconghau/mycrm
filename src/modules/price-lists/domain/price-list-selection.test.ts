import { describe, expect, it } from 'vitest'
import { classifyPriceSelection, PriceSelectionReasonError } from './price-list-selection'

const eligible = [{ id: 10, unitPrice: '100.00' }]

describe('price selection classification', () => {
  it('allows any eligible reference at the listed value without a reason', () => {
    expect(classifyPriceSelection({ priceListItemId: 10, selectedAmount: '100.000' }, eligible)).toEqual({
      selectionType: 'REFERENCE', listedAmount: '100.00', reason: null, requiresOverrideGrant: false,
    })
  })

  it('requires a reason for manual and override amounts', () => {
    expect(() => classifyPriceSelection({ selectedAmount: '90' }, eligible)).toThrow(PriceSelectionReasonError)
    expect(() => classifyPriceSelection({ priceListItemId: 10, selectedAmount: '90' }, eligible)).toThrow(PriceSelectionReasonError)
    expect(classifyPriceSelection({ selectedAmount: '90', reason: 'Customer request' }, eligible).selectionType).toBe('MANUAL')
    expect(classifyPriceSelection({ priceListItemId: 10, selectedAmount: '90', reason: 'Customer request' }, eligible).selectionType).toBe('OVERRIDE')
  })

  it('rejects an item that is outside the recomputed eligible set', () => {
    expect(() => classifyPriceSelection({ priceListItemId: 11, selectedAmount: '100' }, eligible)).toThrow(/no longer eligible/)
  })
})
