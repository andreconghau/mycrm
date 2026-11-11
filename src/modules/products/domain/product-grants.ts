const productReadFields = [
  'id',
  'sku',
  'displayName',
  'category',
  'speciesCommonName',
  'speciesScientificName',
  'productFamily',
  'defaultUnit',
  'status',
  'descriptionEn',
  'descriptionVi',
  'descriptionKo',
  'version',
  'names',
  'aliases',
] as const

const productWriteFields = [
  'category',
  'speciesCommonName',
  'speciesScientificName',
  'productFamily',
  'defaultUnit',
  'descriptionEn',
  'descriptionVi',
  'descriptionKo',
  'names',
  'aliases',
] as const

export const productCreateWriteFields = [
  'sku',
  ...productWriteFields,
] as const

export const productAdminGrants = [
  {
    resource: 'products',
    action: 'create',
    recordScope: 'ALL',
    readFields: productReadFields,
    writeFields: productCreateWriteFields,
  },
  {
    resource: 'products',
    action: 'read',
    recordScope: 'ALL',
    readFields: productReadFields,
    writeFields: [],
  },
  {
    resource: 'products',
    action: 'update',
    recordScope: 'ALL',
    readFields: productReadFields,
    writeFields: productWriteFields,
  },
  {
    resource: 'products',
    action: 'approve',
    recordScope: 'ALL',
    readFields: productReadFields,
    writeFields: [],
  },
  {
    resource: 'products',
    action: 'retire',
    recordScope: 'ALL',
    readFields: productReadFields,
    writeFields: [],
  },
] as const

export const productSaleGrants = [
  {
    resource: 'products',
    action: 'read',
    recordScope: 'ALL',
    readFields: productReadFields,
    writeFields: [],
  },
] as const
