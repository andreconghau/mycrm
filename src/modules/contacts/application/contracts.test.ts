import { describe, expect, it } from 'vitest'
import {
  channelInputSchema,
  contactDuplicateCandidatesSchema,
  contactListQuerySchema,
  createContactSchema,
  normalizeChannelHandle,
  normalizeEmailHandle,
  normalizePhoneHandle,
  preferenceInputSchema,
  setPrimaryContactSchema,
  transferContactSchema,
  updateContactSchema,
} from './contracts'

describe('contact contracts', () => {
  it('normalizes an email handle without inferring identity (IT-19)', () => {
    expect(normalizeEmailHandle('  Buyer.Name+kr@Example.COM ')).toBe(
      'buyer.name+kr@example.com',
    )
    // Dots and +tags are preserved: stripping them would collapse two real
    // people who deliberately use tagged addresses.
    expect(normalizeEmailHandle('a.b+1@x.com')).not.toBe('ab@x.com')
    expect(normalizeChannelHandle('email', 'A@B.COM')).toBe('a@b.com')
  })

  it('normalizes phone handles to digits while keeping an explicit country prefix', () => {
    expect(normalizePhoneHandle(' +82 (10) 1234-5678 ')).toBe('+821012345678')
    expect(normalizePhoneHandle('010 1234 5678')).toBe('01012345678')
    expect(normalizeChannelHandle('whatsapp', '+84 90 123 4567')).toBe(
      '+84901234567',
    )
  })

  it('accepts the approved create payload and rejects unknown fields', () => {
    expect(
      createContactSchema.safeParse({
        customerId: 4,
        displayName: 'Kim Minji',
        jobTitle: 'Procurement Manager',
        preferredLanguage: 'ko',
        channels: [{ kind: 'email', handle: 'minji@buyer.test' }],
      }).success,
    ).toBe(true)
    expect(
      createContactSchema.safeParse({
        customerId: 4,
        displayName: 'Kim Minji',
        marketId: 9,
      }).success,
    ).toBe(false)
  })

  it('never accepts a parent change through the generic update', () => {
    expect(
      updateContactSchema.safeParse({ version: 1, customerId: 2 }).success,
    ).toBe(false)
    expect(
      updateContactSchema.safeParse({ version: 1, marketId: 2 }).success,
    ).toBe(false)
    expect(updateContactSchema.safeParse({ version: 1 }).success).toBe(false)
    expect(
      updateContactSchema.safeParse({ version: 1, displayName: 'Lee' }).success,
    ).toBe(true)
  })

  it('validates channel kinds, email shape and primary flag default', () => {
    const parsed = channelInputSchema.parse({
      kind: 'phone',
      handle: '+82 10 1111 2222',
    })
    expect(parsed.isPrimary).toBe(false)
    expect(
      channelInputSchema.safeParse({ kind: 'email', handle: 'not-an-email' })
        .success,
    ).toBe(false)
    expect(
      channelInputSchema.safeParse({ kind: 'telegram', handle: 'x' }).success,
    ).toBe(false)
    expect(
      channelInputSchema.safeParse({
        kind: 'email',
        handle: 'a@b.test',
        verifiedAt: '2026-01-01T00:00:00Z',
      }).success,
    ).toBe(false)
  })

  it('defaults consent to denied and requires an explicit recorded instant', () => {
    const parsed = preferenceInputSchema.parse({
      purpose: 'commercial',
      recordedAt: '2026-11-11T02:00:00Z',
    })
    expect(parsed.allowed).toBe(false)
    expect(parsed.recordedAt).toBeInstanceOf(Date)
    expect(
      preferenceInputSchema.safeParse({ purpose: 'commercial' }).success,
    ).toBe(false)
    expect(
      preferenceInputSchema.safeParse({
        purpose: 'anything',
        recordedAt: '2026-11-11T02:00:00Z',
      }).success,
    ).toBe(false)
  })

  it('restricts primary contexts to the approved allowlist', () => {
    expect(
      setPrimaryContactSchema.safeParse({ version: 1, context: 'invoicing' })
        .success,
    ).toBe(true)
    expect(
      setPrimaryContactSchema.safeParse({ version: 1, context: 'anything' })
        .success,
    ).toBe(false)
  })

  it('requires an audited reason for a transfer', () => {
    expect(
      transferContactSchema.safeParse({
        version: 1,
        targetCustomerId: 7,
        reason: 'ok',
      }).success,
    ).toBe(false)
    expect(
      transferContactSchema.safeParse({
        version: 1,
        targetCustomerId: 7,
        reason: 'Buyer restructured its procurement entity',
      }).success,
    ).toBe(true)
  })

  it('bounds the list query and rejects a malformed cursor', () => {
    const parsed = contactListQuerySchema.parse({
      marketCode: 'kr',
      active: 'false',
    })
    expect(parsed).toMatchObject({ marketCode: 'KR', active: false, limit: 50 })
    expect(
      contactListQuerySchema.safeParse({ marketCode: 'KR', limit: '500' })
        .success,
    ).toBe(false)
    expect(
      contactListQuerySchema.safeParse({ marketCode: 'KR', cursor: 'nope' })
        .success,
    ).toBe(false)
  })

  it('requires at least one channel for a duplicate check', () => {
    expect(
      contactDuplicateCandidatesSchema.safeParse({ channels: [] }).success,
    ).toBe(false)
    expect(
      contactDuplicateCandidatesSchema.safeParse({
        channels: [{ kind: 'email', handle: 'a@b.test' }],
      }).success,
    ).toBe(true)
  })
})
