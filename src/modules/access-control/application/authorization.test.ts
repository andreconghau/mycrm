import { describe, expect, it } from 'vitest'
import { canAccessRecord, requireGrant, strongestScope } from './authorization'
import {
  AccessDeniedError,
  type EffectiveGrant,
  type Principal,
} from '../domain/types'

const principal: Principal = {
  userId: 7,
  sessionId: 11,
  displayName: 'Synthetic User',
  email: 'synthetic@example.test',
  roles: ['sale'],
  teamIds: [3],
  marketIds: [1],
}

const grants: EffectiveGrant[] = [
  {
    resource: 'customers',
    action: 'read',
    recordScope: 'OWN',
    readFields: ['id', 'legalName'],
    writeFields: [],
  },
  {
    resource: 'customers',
    action: 'read',
    recordScope: 'TEAM',
    readFields: ['id'],
    writeFields: [],
  },
]

describe('default-deny authorization', () => {
  it('chooses the strongest explicit scope and unions only explicit fields', () => {
    expect(strongestScope(grants)).toBe('TEAM')
    expect(requireGrant(grants, 'customers', 'read')).toEqual({
      scope: 'TEAM',
      readFields: ['id', 'legalName'],
      writeFields: [],
    })
  })

  it('denies unknown resource/action pairs', () => {
    expect(() => requireGrant(grants, 'customers', 'export')).toThrow(
      AccessDeniedError,
    )
  })

  it('enforces owner, team and assigned record predicates', () => {
    expect(canAccessRecord(principal, 'OWN', { ownerId: 7 })).toBe(true)
    expect(canAccessRecord(principal, 'OWN', { ownerId: 8 })).toBe(false)
    expect(canAccessRecord(principal, 'TEAM', { teamId: 3 })).toBe(true)
    expect(canAccessRecord(principal, 'TEAM', { teamId: 4 })).toBe(false)
    expect(canAccessRecord(principal, 'ASSIGNED', { assigneeIds: [7] })).toBe(
      true,
    )
    expect(canAccessRecord(principal, 'NONE', { ownerId: 7 })).toBe(false)
  })
})
