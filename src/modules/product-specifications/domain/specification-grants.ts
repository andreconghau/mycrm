/**
 * Approved M07 authorization boundary (owner decision 5, 2026-11-11): the same
 * shape as M06 Products — `admin` and `manager` hold the full set, `sale` is
 * read-only and `accountant` receives no grant because the role is not
 * activated in R1. There is no maker-checker separation between editing and
 * approving a revision.
 *
 * Unlike the global product catalog, specifications are market-scoped: the
 * record scope below is `ALL` within the markets the principal is a member of,
 * and market membership is enforced separately by the repository.
 */

const specificationReadFields = [
  'id',
  'marketId',
  'productId',
  'customerId',
  'code',
  'active',
  'version',
  'currentRevision',
  'revisions',
  'revisionNo',
  'status',
  'nameEn',
  'nameVi',
  'nameKo',
  'descriptionEn',
  'descriptionVi',
  'descriptionKo',
  'grade',
  'processing',
  'treatment',
  'frozenForm',
  'sizeBand',
  'sizeUnit',
  'netWeightPerPack',
  'grossWeightPerPack',
  'weightUnit',
  'packsPerCarton',
  'cartonNetWeight',
  'glazingPercent',
  'packaging',
  'packagingMaterial',
  'uom',
  'moq',
  'moqUnit',
  'storageTempC',
  'shelfLifeMonths',
  'originCountry',
  'certifications',
  'labelLanguages',
  'buyerRequirements',
  'notes',
  'requirements',
  'approvedAt',
  'approvedBy',
  'archivedAt',
  'createdBy',
] as const

const specificationWriteFields = [
  'nameEn',
  'nameVi',
  'nameKo',
  'descriptionEn',
  'descriptionVi',
  'descriptionKo',
  'grade',
  'processing',
  'treatment',
  'frozenForm',
  'sizeBand',
  'sizeUnit',
  'netWeightPerPack',
  'grossWeightPerPack',
  'weightUnit',
  'packsPerCarton',
  'cartonNetWeight',
  'glazingPercent',
  'packaging',
  'packagingMaterial',
  'uom',
  'moq',
  'moqUnit',
  'storageTempC',
  'shelfLifeMonths',
  'originCountry',
  'certifications',
  'labelLanguages',
  'buyerRequirements',
  'notes',
  'requirements',
] as const

export const specificationCreateWriteFields = [
  'productId',
  'customerId',
  ...specificationWriteFields,
] as const

export const specificationAdminGrants = [
  {
    resource: 'specifications',
    action: 'create',
    recordScope: 'ALL',
    readFields: specificationReadFields,
    writeFields: specificationCreateWriteFields,
  },
  {
    resource: 'specifications',
    action: 'read',
    recordScope: 'ALL',
    readFields: specificationReadFields,
    writeFields: [],
  },
  {
    resource: 'specifications',
    action: 'update',
    recordScope: 'ALL',
    readFields: specificationReadFields,
    writeFields: specificationWriteFields,
  },
  {
    resource: 'specifications',
    action: 'approve',
    recordScope: 'ALL',
    readFields: specificationReadFields,
    writeFields: [],
  },
  {
    resource: 'specifications',
    action: 'archive',
    recordScope: 'ALL',
    readFields: specificationReadFields,
    writeFields: [],
  },
] as const

export const specificationSaleGrants = [
  {
    resource: 'specifications',
    action: 'read',
    recordScope: 'ALL',
    readFields: specificationReadFields,
    writeFields: [],
  },
] as const

export { specificationReadFields, specificationWriteFields }
