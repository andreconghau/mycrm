import { describe, expect, it } from 'vitest'
import {
  canTransitionCustomer,
  createCustomerSchema,
  normalizeIdentifier,
  updateCustomerSchema,
} from './contracts'

describe('customer contracts', () => {
  it('normalizes compatibility-equivalent business identifiers', () => {
    expect(normalizeIdentifier('  ＡＣＭＥ  001 ')).toBe('ACME 001')
  })

  it('accepts the proposed customer fields and rejects unknown fields', () => {
    expect(
      createCustomerSchema.safeParse({
        code: 'CUS-001',
        legalName: 'North Coast Foods Ltd',
        countryCode: 'kr',
        preferredCurrency: 'krw',
        status: 'PROSPECT',
      }).success,
    ).toBe(true)
    expect(
      createCustomerSchema.safeParse({
        code: 'CUS-001',
        legalName: 'North Coast Foods Ltd',
        countryCode: 'KR',
        marketId: 9,
        isAdmin: true,
      }).success,
    ).toBe(false)
  })

  it('requires an actual change in an update and rejects invalid status values', () => {
    expect(updateCustomerSchema.safeParse({ version: 1 }).success).toBe(false)
    expect(
      updateCustomerSchema.safeParse({ version: 1, status: 'DELETED' }).success,
    ).toBe(false)
  })

  it('enforces the customer lifecycle and terminal archive state', () => {
    expect(canTransitionCustomer('PROSPECT', 'ACTIVE')).toBe(true)
    expect(canTransitionCustomer('ACTIVE', 'ON_HOLD')).toBe(true)
    expect(canTransitionCustomer('ARCHIVED', 'ACTIVE')).toBe(false)
    expect(canTransitionCustomer('UNKNOWN', 'ACTIVE')).toBe(false)
  })
})
