import { describe, expect, it } from 'vitest'
import { canTransitionPriceList, effectivePriceListState, isEditablePriceListStatus } from './price-list-lifecycle'

describe('price list lifecycle', () => {
  it('allows only DRAFT to APPROVED/ARCHIVED and APPROVED to ARCHIVED', () => {
    expect(canTransitionPriceList('DRAFT', 'APPROVED')).toBe(true)
    expect(canTransitionPriceList('APPROVED', 'ARCHIVED')).toBe(true)
    expect(canTransitionPriceList('ARCHIVED', 'DRAFT')).toBe(false)
    expect(canTransitionPriceList('UNKNOWN', 'APPROVED')).toBe(false)
    expect(isEditablePriceListStatus('DRAFT')).toBe(true)
    expect(isEditablePriceListStatus('APPROVED')).toBe(false)
  })

  it('derives effective state with inclusive start and exclusive end', () => {
    const list = { status: 'APPROVED', validFrom: '2026-01-01T00:00:00Z', validTo: '2026-02-01T00:00:00Z' }
    expect(effectivePriceListState(list, new Date('2025-12-31T23:59:59.999Z'))).toBe('SCHEDULED')
    expect(effectivePriceListState(list, new Date('2026-01-01T00:00:00Z'))).toBe('ACTIVE')
    expect(effectivePriceListState(list, new Date('2026-01-31T23:59:59.999Z'))).toBe('ACTIVE')
    expect(effectivePriceListState(list, new Date('2026-02-01T00:00:00Z'))).toBe('EXPIRED')
  })
})
