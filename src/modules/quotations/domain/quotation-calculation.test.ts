import { describe, expect, it } from 'vitest'
import { calculateQuotation, QuotationCalculationError } from './quotation-calculation'

describe('calculateQuotation', () => {
  it('rounds only the aggregate with ROUND_HALF_EVEN', () => {
    expect(calculateQuotation({ lines: [{ quantity: '1', unitPrice: '20.005', currency: 'USD' }], adjustments: [], vndPerUsd: null }).roundedUsdTotal).toBe('20.00')
    expect(calculateQuotation({ lines: [{ quantity: '1', unitPrice: '20.015', currency: 'USD' }], adjustments: [], vndPerUsd: null }).roundedUsdTotal).toBe('20.02')
    expect(calculateQuotation({ lines: [
      { quantity: '1', unitPrice: '10.004', currency: 'USD' },
      { quantity: '1', unitPrice: '10.004', currency: 'USD' },
    ], adjustments: [], vndPerUsd: null }).roundedUsdTotal).toBe('20.01')
  })

  it('keeps mixed source currencies separate and converts VND exactly', () => {
    const result = calculateQuotation({
      lines: [
        { quantity: '2', unitPrice: '10.25', currency: 'USD' },
        { quantity: '3', unitPrice: '10000', currency: 'VND' },
      ],
      adjustments: [
        { currency: 'USD', amount: '1.25' },
        { currency: 'VND', amount: '5000' },
      ],
      vndPerUsd: '30000.0000',
    })

    expect(result.originalUsdTotal).toBe('21.75')
    expect(result.originalVndTotal).toBe('35000')
    expect(result.unroundedUsdNumerator).toBe('275')
    expect(result.unroundedUsdDenominator).toBe('12')
    expect(result.roundedUsdTotal).toBe('22.92')
    expect(result.lines[1].convertedUsdAmount).toBe('1.000000000000000000')
  })

  it('does not round high precision line products before the total', () => {
    const result = calculateQuotation({
      lines: [{ quantity: '0.123456789012345678', unitPrice: '0.123456789012345678', currency: 'USD' }],
      adjustments: [],
      vndPerUsd: null,
    })
    expect(result.lines[0].originalAmount).toBe('0.015241578753238836527968299765279684')
    expect(result.unroundedUsdNumerator).toBe('3810394688309709131992074941319921')
    expect(result.unroundedUsdDenominator).toBe('250000000000000000000000000000000000')
    expect(result.roundedUsdTotal).toBe('0.02')
  })

  it('requires a positive rate for VND inputs and rejects negative amounts', () => {
    expect(() => calculateQuotation({
      lines: [{ quantity: '1', unitPrice: '1', currency: 'VND' }], adjustments: [], vndPerUsd: null,
    })).toThrow(QuotationCalculationError)
    expect(() => calculateQuotation({
      lines: [{ quantity: '1', unitPrice: '-1', currency: 'USD' }], adjustments: [], vndPerUsd: null,
    })).toThrow(QuotationCalculationError)
  })
})
