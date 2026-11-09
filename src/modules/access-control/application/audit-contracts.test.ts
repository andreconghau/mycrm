import { describe, expect, it } from 'vitest'
import {
  auditQuerySchema,
  decodeAuditCursor,
  encodeAuditCursor,
} from './audit-contracts'
import { projectSafeAuditDiff, projectSafeAuditReason } from './audit-safe-diff'

describe('audit contracts and safe projections', () => {
  it('bounds list filters and rejects invalid ranges and cursors', () => {
    expect(auditQuerySchema.safeParse({ limit: '101' }).success).toBe(false)
    expect(
      auditQuerySchema.safeParse({
        from: '2026-11-07T12:00:00Z',
        to: '2026-11-07T11:00:00Z',
      }).success,
    ).toBe(false)
    expect(auditQuerySchema.safeParse({ cursor: 'garbage' }).success).toBe(
      false,
    )
  })

  it('round-trips stable cursor data and rejects malformed data', () => {
    const cursor = { occurredAt: '2026-11-07T00:00:00.000Z', id: 42 }
    expect(decodeAuditCursor(encodeAuditCursor(cursor))).toEqual(cursor)
    expect(decodeAuditCursor('%%%')).toBeNull()
  })

  it('projects only allowlisted safe diff fields', () => {
    expect(
      projectSafeAuditDiff({
        roleCode: 'sale',
        active: false,
        userId: 9,
        name: 'Sensitive free text',
        email: 'person@example.com',
        token: 'secret-token',
      }),
    ).toEqual({ roleCode: 'sale', active: false, userId: 9 })
  })

  it('redacts common sensitive patterns from audit reasons', () => {
    expect(
      projectSafeAuditReason(
        'Reviewed person@example.com, +1 212 555 0100; token=abc',
      ),
    ).toBe(
      'Reviewed [redacted-email], [redacted-number]; [redacted-credential]',
    )
  })
})
