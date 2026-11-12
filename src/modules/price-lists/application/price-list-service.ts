import 'server-only'
import { requireGrant } from '@/modules/access-control/application/authorization'
import type { EffectiveGrant, Principal } from '@/modules/access-control/domain/types'
import { AccessDeniedError } from '@/modules/access-control/domain/types'
import {
  approvePriceListSchema,
  archivePriceListSchema,
  createPriceListItemSchema,
  createPriceListSchema,
  createSelectionSchema,
  decodePriceListCursor,
  eligibilityQuerySchema,
  priceListQuerySchema,
  selectionHistoryQuerySchema,
  updatePriceListItemSchema,
  updatePriceListSchema,
} from './contracts'
import { priceListReadFields, priceListWriteFields } from '../domain/price-list-grants'
import { effectivePriceListState } from '../domain/price-list-lifecycle'
import { classifyPriceSelection } from '../domain/price-list-selection'
import { PriceListRepository, type PriceListTransaction } from '../infrastructure/price-list-repository'

const controlKeys = new Set(['version', 'reason'])

function assertAllowedFields(granted: string[], value: Record<string, unknown>, writable: readonly string[]) {
  const allowed = new Set(granted)
  if (Object.keys(value).some((field) => !controlKeys.has(field) && value[field] !== undefined && (!writable.includes(field) || !allowed.has(field)))) {
    throw new AccessDeniedError()
  }
}

function project(value: Record<string, unknown>, allowed: string[]) {
  const visible = new Set(allowed)
  const result: Record<string, unknown> = {}
  for (const field of priceListReadFields) if (visible.has(field) && field in value) result[field] = value[field]
  return result
}

function projectList(value: Record<string, unknown>, allowed: string[]) {
  const projected = project(value, allowed)
  if ('status' in value && 'validFrom' in value) {
    projected.effectiveState = effectivePriceListState({
      status: String(value.status),
      validFrom: value.validFrom as Date | string,
      validTo: value.validTo as Date | string | null,
    })
  }
  if (Array.isArray(value.items)) projected.items = value.items
  return projected
}

export class PriceListService {
  constructor(private readonly repository = new PriceListRepository()) {}

  resolveMarketId(actor: Principal, marketCode: string) {
    return this.repository.resolveMarketId(actor, marketCode)
  }

  async list(actor: Principal, grants: EffectiveGrant[], raw: unknown, marketId: number) {
    const query = priceListQuerySchema.parse(raw)
    const grant = requireGrant(grants, 'price_lists', 'read')
    const page = await this.repository.list({ ...query, cursor: query.cursor ? decodePriceListCursor(query.cursor) : undefined, actor, marketId })
    return { items: page.items.map((item) => projectList(item as unknown as Record<string, unknown>, grant.readFields)), nextCursor: page.nextCursor }
  }

  async get(actor: Principal, grants: EffectiveGrant[], marketId: number, id: number) {
    const grant = requireGrant(grants, 'price_lists', 'read')
    const row = await this.repository.get(actor, marketId, id)
    return projectList(row as unknown as Record<string, unknown>, grant.readFields)
  }

  async create(actor: Principal, grants: EffectiveGrant[], marketId: number, raw: unknown, requestId: string) {
    const value = createPriceListSchema.parse(raw)
    const grant = requireGrant(grants, 'price_lists', 'create')
    assertAllowedFields(grant.writeFields, value, priceListWriteFields)
    const row = await this.repository.create({ actor, requestId, marketId, values: value as unknown as Record<string, unknown> })
    return projectList(row as unknown as Record<string, unknown>, grant.readFields)
  }

  async update(actor: Principal, grants: EffectiveGrant[], marketId: number, id: number, raw: unknown, requestId: string) {
    const value = updatePriceListSchema.parse(raw)
    const grant = requireGrant(grants, 'price_lists', 'update')
    assertAllowedFields(grant.writeFields, value, priceListWriteFields)
    const row = await this.repository.update({ actor, requestId, marketId, id, version: value.version, values: value as unknown as Record<string, unknown> })
    return projectList(row as unknown as Record<string, unknown>, grant.readFields)
  }

  async addItem(actor: Principal, grants: EffectiveGrant[], marketId: number, listId: number, raw: unknown, requestId: string) {
    const value = createPriceListItemSchema.parse(raw)
    const grant = requireGrant(grants, 'price_lists', 'update')
    assertAllowedFields(grant.writeFields, value, priceListWriteFields)
    return this.repository.addItem({ actor, requestId, marketId, listId, values: value as unknown as Record<string, unknown> })
  }

  async updateItem(actor: Principal, grants: EffectiveGrant[], marketId: number, listId: number, itemId: number, raw: unknown, requestId: string) {
    const value = updatePriceListItemSchema.parse(raw)
    requireGrant(grants, 'price_lists', 'update')
    return this.repository.updateItem({ actor, requestId, marketId, listId, itemId, version: value.version, values: value as unknown as Record<string, unknown> })
  }

  async approve(actor: Principal, grants: EffectiveGrant[], marketId: number, id: number, raw: unknown, requestId: string) {
    const value = approvePriceListSchema.parse(raw)
    const grant = requireGrant(grants, 'price_lists', 'approve')
    const row = await this.repository.approve({ actor, requestId, marketId, id, version: value.version })
    return projectList(row as unknown as Record<string, unknown>, grant.readFields)
  }

  async archive(actor: Principal, grants: EffectiveGrant[], marketId: number, id: number, raw: unknown, requestId: string) {
    const value = archivePriceListSchema.parse(raw)
    const grant = requireGrant(grants, 'price_lists', 'archive')
    const row = await this.repository.archive({ actor, requestId, marketId, id, ...value })
    return projectList(row as unknown as Record<string, unknown>, grant.readFields)
  }

  async eligible(actor: Principal, grants: EffectiveGrant[], marketId: number, raw: unknown) {
    requireGrant(grants, 'price_lists', 'read')
    const query = eligibilityQuerySchema.parse(raw)
    return this.repository.eligible({ actor, criteria: { ...query, marketId, at: query.at ? new Date(query.at) : undefined } })
  }

  async recordSelection(actor: Principal, grants: EffectiveGrant[], marketId: number, raw: unknown, requestId: string) {
    const value = createSelectionSchema.parse(raw)
    requireGrant(grants, 'price_lists', 'select')
    const eligibility = await this.repository.eligible({ actor, criteria: {
      marketId, productId: value.productId, specificationVersionId: value.specificationVersionId,
      customerId: value.customerId, quantity: value.quantity, unit: value.unit,
      currency: value.currency, priceBasis: value.priceBasis,
    } })
    const classification = classifyPriceSelection(value, eligibility.options)
    if (classification.requiresOverrideGrant) requireGrant(grants, 'price_lists', 'override')
    const selected = await this.repository.recordSelection({ actor, requestId, marketId, values: value as unknown as Record<string, unknown> })
    return selected
  }

  async recordQuotationLineSelection(actor: Principal, grants: EffectiveGrant[], marketId: number, quotationLineId: number, raw: unknown, requestId: string, executor: PriceListTransaction) {
    const value = createSelectionSchema.parse(raw)
    requireGrant(grants, 'price_lists', 'select')
    const eligibility = await this.repository.eligible({ actor, executor, criteria: {
      marketId, productId: value.productId, specificationVersionId: value.specificationVersionId,
      customerId: value.customerId, quantity: value.quantity, unit: value.unit,
      currency: value.currency, priceBasis: value.priceBasis,
    } })
    const classification = classifyPriceSelection(value, eligibility.options)
    if (classification.requiresOverrideGrant) requireGrant(grants, 'price_lists', 'override')
    const canOverride = grants.some((grant) => grant.resource === 'price_lists' && grant.action === 'override')
    return this.repository.recordQuotationLineSelection({
      actor, requestId, marketId, quotationLineId,
      values: value as unknown as Record<string, unknown>, executor, canOverride,
    })
  }

  async history(actor: Principal, grants: EffectiveGrant[], marketId: number, raw: unknown) {
    const query = selectionHistoryQuerySchema.parse(raw)
    const grant = requireGrant(grants, 'price_lists', 'read')
    const rows = await this.repository.history(actor, marketId, query)
    return rows.map((row) => ({
      id: row.id,
      ...(grant.readFields.includes('marketId') ? { marketId: row.marketId } : {}),
      ...(grant.readFields.includes('selectionType') ? { selectionType: row.selectionType } : {}),
      ...(grant.readFields.includes('selectedAmount') ? { selectedAmount: row.selectedAmount } : {}),
      ...(grant.readFields.includes('listedAmount') ? { listedAmount: row.listedAmount } : {}),
      ...(grant.readFields.includes('reason') ? { reason: row.reason } : {}),
      ...(grant.readFields.includes('selectedBy') ? { selectedBy: row.selectedBy } : {}),
      ...(grant.readFields.includes('selectedAt') ? { selectedAt: row.selectedAt } : {}),
      ...(grant.readFields.includes('currency') ? { currency: row.currency } : {}),
      ...(grant.readFields.includes('unit') ? { unit: row.unit } : {}),
      ...(grant.readFields.includes('productId') ? { productId: row.productId } : {}),
    }))
  }
}
