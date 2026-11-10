const customerReadFields = [
  'id',
  'code',
  'legalName',
  'tradeName',
  'countryCode',
  'preferredLanguage',
  'preferredCurrency',
  'website',
  'status',
  'ownerId',
  'teamId',
  'version',
  'addresses',
  'identifiers',
] as const

const customerWriteFields = [
  'code',
  'legalName',
  'tradeName',
  'countryCode',
  'preferredLanguage',
  'preferredCurrency',
  'website',
  'status',
  'ownerId',
  'teamId',
  'addresses',
  'identifiers',
] as const

export const customerAdminGrants = [
  {
    resource: 'customers',
    action: 'create',
    recordScope: 'ALL',
    readFields: customerReadFields,
    writeFields: customerWriteFields,
  },
  {
    resource: 'customers',
    action: 'read',
    recordScope: 'ALL',
    readFields: customerReadFields,
    writeFields: [],
  },
  {
    resource: 'customers',
    action: 'update',
    recordScope: 'ALL',
    readFields: customerReadFields,
    writeFields: customerWriteFields,
  },
  {
    resource: 'customers',
    action: 'archive',
    recordScope: 'ALL',
    readFields: customerReadFields,
    writeFields: [],
  },
  {
    resource: 'customers',
    action: 'reassign',
    recordScope: 'ALL',
    readFields: customerReadFields,
    writeFields: ['ownerId', 'teamId'],
  },
] as const
