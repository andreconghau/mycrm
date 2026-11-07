import {
  AccessDeniedError,
  type EffectiveGrant,
  type Principal,
  type RecordAccessContext,
  type RecordScope,
} from '../domain/types'

const scopeStrength: Record<RecordScope, number> = {
  NONE: 0,
  OWN: 1,
  ASSIGNED: 2,
  TEAM: 3,
  ALL: 4,
}

export function strongestScope(grants: EffectiveGrant[]): RecordScope {
  return grants.reduce<RecordScope>(
    (current, grant) =>
      scopeStrength[grant.recordScope] > scopeStrength[current]
        ? grant.recordScope
        : current,
    'NONE',
  )
}

export function canAccessRecord(
  principal: Principal,
  scope: RecordScope,
  record: RecordAccessContext,
) {
  switch (scope) {
    case 'ALL':
      return true
    case 'OWN':
      return record.ownerId === principal.userId
    case 'TEAM':
      return record.teamId != null && principal.teamIds.includes(record.teamId)
    case 'ASSIGNED':
      return record.assigneeIds?.includes(principal.userId) ?? false
    case 'NONE':
      return false
  }
}

export function requireGrant(
  grants: EffectiveGrant[],
  resource: string,
  action: string,
  principal?: Principal,
  record?: RecordAccessContext,
) {
  const matching = grants.filter(
    (grant) => grant.resource === resource && grant.action === action,
  )
  if (!matching.length) throw new AccessDeniedError()

  const scope = strongestScope(matching)
  if (record && (!principal || !canAccessRecord(principal, scope, record))) {
    throw new AccessDeniedError()
  }

  return {
    scope,
    readFields: [...new Set(matching.flatMap((grant) => grant.readFields))],
    writeFields: [...new Set(matching.flatMap((grant) => grant.writeFields))],
  }
}
