export const contactReadFields = [
  'id',
  'customerId',
  'customerLegalName',
  'displayName',
  'jobTitle',
  'department',
  'preferredLanguage',
  'timezone',
  'active',
  'version',
] as const

export const contactWriteFields = [
  'displayName',
  'jobTitle',
  'department',
  'preferredLanguage',
  'timezone',
  'customerId',
  'channels',
  'context',
] as const

const contactActions = [
  'list',
  'read',
  'create',
  'edit',
  'sensitive-read',
] as const

const writeActions = new Set<string>(['create', 'edit'])

function grantsFor(
  roleCode: 'admin' | 'manager' | 'sale' | 'accountant',
  recordScope: 'ALL' | 'TEAM' | 'OWN' | 'ASSIGNED',
  actions: readonly string[],
) {
  return actions.map((action) => ({
    roleCode,
    resource: 'contacts' as const,
    action,
    recordScope,
    readFields: contactReadFields,
    writeFields: writeActions.has(action) ? contactWriteFields : [],
  }))
}

/**
 * Owner-approved M02 grant matrix (decision D4). `accountant` deliberately has
 * no `sensitive-read`, and its `ASSIGNED` scope has no R1 assignment model, so
 * it resolves to default deny until an assignment model is approved.
 */
export const contactGrants = [
  ...grantsFor('admin', 'ALL', contactActions),
  ...grantsFor('manager', 'TEAM', contactActions),
  ...grantsFor('sale', 'OWN', contactActions),
  ...grantsFor('accountant', 'ASSIGNED', ['list', 'read']),
]

export const contactAdminGrants = contactGrants.filter(
  (grant) => grant.roleCode === 'admin',
)
