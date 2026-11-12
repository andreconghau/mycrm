const readFields = [
  'id',
  'marketId',
  'code',
  'customerId',
  'tier',
  'currency',
  'validFrom',
  'validTo',
  'status',
  'effectiveState',
  'approvedBy',
  'approvedAt',
  'archivedAt',
  'archiveReason',
  'createdBy',
  'items',
  'selectionType',
  'listedAmount',
  'selectedAmount',
  'reason',
  'selectedBy',
  'selectedAt',
  'productId',
  'priceListItemId',
  'unit',
] as const

const writeFields = [
  'code',
  'customerId',
  'tier',
  'currency',
  'validFrom',
  'validTo',
  'productId',
  'specificationVersionId',
  'unit',
  'priceBasis',
  'priceBasisNote',
  'unitPrice',
  'minQuantity',
  'maxQuantity',
] as const

export const priceListAdminGrants = [
  { resource: 'price_lists', action: 'create', recordScope: 'ALL', readFields, writeFields },
  { resource: 'price_lists', action: 'read', recordScope: 'ALL', readFields, writeFields: [] },
  { resource: 'price_lists', action: 'update', recordScope: 'ALL', readFields, writeFields },
  { resource: 'price_lists', action: 'approve', recordScope: 'ALL', readFields, writeFields: [] },
  { resource: 'price_lists', action: 'archive', recordScope: 'ALL', readFields, writeFields: [] },
  { resource: 'price_lists', action: 'select', recordScope: 'ALL', readFields, writeFields: [] },
  { resource: 'price_lists', action: 'override', recordScope: 'ALL', readFields, writeFields: [] },
] as const

export const priceListSaleGrants = [
  { resource: 'price_lists', action: 'read', recordScope: 'ALL', readFields, writeFields: [] },
  { resource: 'price_lists', action: 'select', recordScope: 'ALL', readFields, writeFields: [] },
] as const

export { readFields as priceListReadFields, writeFields as priceListWriteFields }
