export const roleCodes = ['admin', 'manager', 'sale', 'accountant'] as const
export type RoleCode = (typeof roleCodes)[number]

export const recordScopes = ['NONE', 'OWN', 'TEAM', 'ASSIGNED', 'ALL'] as const
export type RecordScope = (typeof recordScopes)[number]

export type Principal = {
  userId: number
  sessionId: number
  displayName: string
  email: string
  roles: RoleCode[]
  teamIds: number[]
  marketIds: number[]
}

export type EffectiveGrant = {
  resource: string
  action: string
  recordScope: RecordScope
  readFields: string[]
  writeFields: string[]
}

export type RecordAccessContext = {
  ownerId?: number | null
  teamId?: number | null
  assigneeIds?: number[]
}

export class AccessDeniedError extends Error {
  constructor(message = 'The requested action is not permitted') {
    super(message)
    this.name = 'AccessDeniedError'
  }
}

export class AuthenticationError extends Error {
  constructor(message = 'Authentication is required') {
    super(message)
    this.name = 'AuthenticationError'
  }
}
