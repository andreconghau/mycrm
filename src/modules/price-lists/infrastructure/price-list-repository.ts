import 'server-only'
import { and, desc, eq, ilike, inArray, lt, or, sql, type SQL } from 'drizzle-orm'
import { AccessDeniedError, type Principal } from '@/modules/access-control/domain/types'
import { compare, fromString } from '@/lib/decimal'
import { getDatabase } from '@/modules/access-control/infrastructure/database'
import {
  auditEvents,
  customers,
  markets,
  priceListItems,
  priceLists,
  priceSelections,
  products,
  specificationVersions,
} from '@/modules/access-control/infrastructure/schema'
import { selectEligiblePrices, type EligibilityCriteria } from '../domain/price-list-eligibility'
import { canTransitionPriceList } from '../domain/price-list-lifecycle'
import { classifyPriceSelection, PriceSelectionBusinessRuleError } from '../domain/price-list-selection'

type Database = ReturnType<typeof getDatabase>
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]

export class PriceListNotFoundError extends Error {}
export class PriceListConflictError extends Error {}
export class PriceListImmutableError extends Error {}
export class PriceListBusinessRuleError extends Error {}

function postgresErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  if ('code' in error && typeof error.code === 'string') return error.code
  if ('cause' in error) return postgresErrorCode(error.cause)
  return undefined
}

function cursorFor(row: { createdAt: Date; id: number }) {
  return Buffer.from(JSON.stringify({ createdAt: row.createdAt.toISOString(), id: row.id })).toString('base64url')
}

function timestampValues(values: Record<string, unknown>) {
  const result = { ...values }
  for (const field of ['validFrom', 'validTo']) {
    if (typeof result[field] === 'string') result[field] = new Date(result[field] as string)
  }
  return result
}

function validateItemCombination(values: Record<string, unknown>) {
  if (values.priceBasis === 'OTHER' && (typeof values.priceBasisNote !== 'string' || !values.priceBasisNote.trim())) {
    throw new PriceListBusinessRuleError('OTHER price basis requires a note')
  }
  if (typeof values.minQuantity === 'string' && typeof values.maxQuantity === 'string' && compare(fromString(values.maxQuantity), fromString(values.minQuantity)) < 0) {
    throw new PriceListBusinessRuleError('maxQuantity must be greater than or equal to minQuantity')
  }
  if (values.validFrom instanceof Date && values.validTo instanceof Date && values.validTo.getTime() <= values.validFrom.getTime()) {
    throw new PriceListBusinessRuleError('validTo must be after validFrom')
  }
}

export class PriceListRepository {
  private readonly database = getDatabase()

  private assertMarketAccess(actor: Principal, marketId: number) {
    if (!actor.marketIds.includes(marketId)) throw new AccessDeniedError()
  }

  async resolveMarketId(actor: Principal, marketCode: string) {
    const [market] = await this.database.select({ id: markets.id }).from(markets)
      .where(and(eq(markets.code, marketCode), eq(markets.active, true))).limit(1)
    if (!market || !actor.marketIds.includes(market.id)) throw new AccessDeniedError()
    return market.id
  }

  async list(input: {
    actor: Principal; marketId: number; query?: string; tier?: string; status?: string;
    effectiveState?: string; customerId?: number; currency?: string; limit: number;
    cursor?: { createdAt: string; id: number }
  }) {
    this.assertMarketAccess(input.actor, input.marketId)
    const now = new Date()
    const conditions: SQL[] = [eq(priceLists.marketId, input.marketId)]
    if (input.query) conditions.push(ilike(priceLists.code, `%${input.query.replace(/[\\%_]/g, '\\$&')}%`))
    if (input.tier) conditions.push(eq(priceLists.tier, input.tier))
    if (input.status) conditions.push(eq(priceLists.status, input.status))
    if (input.customerId) conditions.push(eq(priceLists.customerId, input.customerId))
    if (input.currency) conditions.push(eq(priceLists.currency, input.currency))
    if (input.effectiveState === 'SCHEDULED') conditions.push(eq(priceLists.status, 'APPROVED'), sql`${priceLists.validFrom} > ${now}`)
    if (input.effectiveState === 'ACTIVE') conditions.push(eq(priceLists.status, 'APPROVED'), sql`${priceLists.validFrom} <= ${now}`, or(sql`${priceLists.validTo} IS NULL`, sql`${priceLists.validTo} > ${now}`)!)
    if (input.effectiveState === 'EXPIRED') conditions.push(eq(priceLists.status, 'APPROVED'), sql`${priceLists.validTo} <= ${now}`)
    if (input.cursor) {
      const time = new Date(input.cursor.createdAt)
      conditions.push(or(lt(priceLists.createdAt, time), and(eq(priceLists.createdAt, time), lt(priceLists.id, input.cursor.id)))!)
    }
    const rows = await this.database.select().from(priceLists).where(and(...conditions))
      .orderBy(desc(priceLists.createdAt), desc(priceLists.id)).limit(input.limit + 1)
    const pageRows = rows.slice(0, input.limit)
    const items = pageRows.length ? await this.database.select().from(priceListItems)
      .where(and(eq(priceListItems.marketId, input.marketId), inArray(priceListItems.priceListId, pageRows.map((row) => row.id)))) : []
    const itemsByList = new Map<number, typeof items>()
    for (const item of items) itemsByList.set(item.priceListId, [...(itemsByList.get(item.priceListId) ?? []), item])
    return {
      items: pageRows.map((row) => ({ ...row, items: itemsByList.get(row.id) ?? [] })),
      nextCursor: rows.length > input.limit ? cursorFor(pageRows[pageRows.length - 1]) : null,
    }
  }

  async get(actor: Principal, marketId: number, id: number) {
    this.assertMarketAccess(actor, marketId)
    const [list] = await this.database.select().from(priceLists)
      .where(and(eq(priceLists.marketId, marketId), eq(priceLists.id, id))).limit(1)
    if (!list) throw new PriceListNotFoundError()
    const items = await this.database.select({
      id: priceListItems.id,
      marketId: priceListItems.marketId,
      priceListId: priceListItems.priceListId,
      productId: priceListItems.productId,
      specificationVersionId: priceListItems.specificationVersionId,
      unit: priceListItems.unit,
      priceBasis: priceListItems.priceBasis,
      priceBasisNote: priceListItems.priceBasisNote,
      unitPrice: priceListItems.unitPrice,
      minQuantity: priceListItems.minQuantity,
      maxQuantity: priceListItems.maxQuantity,
      validFrom: priceListItems.validFrom,
      validTo: priceListItems.validTo,
      createdAt: priceListItems.createdAt,
      updatedAt: priceListItems.updatedAt,
      version: priceListItems.version,
      productSku: products.sku,
      productName: products.displayName,
    }).from(priceListItems).innerJoin(products, eq(priceListItems.productId, products.id))
      .where(and(eq(priceListItems.marketId, marketId), eq(priceListItems.priceListId, id)))
      .orderBy(priceListItems.id)
    return { ...list, items }
  }

  async create(input: { actor: Principal; requestId: string; marketId: number; values: Record<string, unknown> }) {
    this.assertMarketAccess(input.actor, input.marketId)
    return this.database.transaction(async (tx) => {
      const values = timestampValues(input.values) as typeof priceLists.$inferInsert
      if (values.customerId != null) await this.requireCustomer(tx, input.marketId, values.customerId)
      const [row] = await tx.insert(priceLists).values({ ...values, marketId: input.marketId, createdBy: input.actor.userId, status: 'DRAFT' }).returning()
      await this.audit(tx, { actor: input.actor, requestId: input.requestId, marketId: input.marketId, action: 'price_list.created', resourceId: row.id, resourceVersion: row.version, safeDiff: { tier: row.tier, currency: row.currency } })
      return row
    })
  }

  async update(input: { actor: Principal; requestId: string; marketId: number; id: number; version: number; values: Record<string, unknown> }) {
    this.assertMarketAccess(input.actor, input.marketId)
    return this.database.transaction(async (tx) => {
      const current = await this.lockList(tx, input.marketId, input.id)
      if (current.status !== 'DRAFT') throw new PriceListImmutableError()
      if (current.version !== input.version) throw new PriceListConflictError()
      const values = { ...input.values } as Record<string, unknown>
      delete values.version
      const combined = { ...current, ...timestampValues(values) }
      if ((combined.tier === 'CUSTOMER') !== (combined.customerId != null)) throw new PriceListBusinessRuleError('Customer tier requires a customer, and other tiers cannot name one')
      if (combined.customerId != null && combined.customerId !== current.customerId) await this.requireCustomer(tx, input.marketId, Number(combined.customerId))
      if (combined.validTo && new Date(combined.validTo).getTime() <= new Date(combined.validFrom).getTime()) throw new PriceListBusinessRuleError('validTo must be after validFrom')
      const [row] = await tx.update(priceLists).set({ ...timestampValues(values), updatedAt: new Date(), version: current.version + 1 }).where(and(eq(priceLists.id, input.id), eq(priceLists.marketId, input.marketId), eq(priceLists.version, input.version))).returning()
      if (!row) throw new PriceListConflictError()
      await this.audit(tx, { actor: input.actor, requestId: input.requestId, marketId: input.marketId, action: 'price_list.updated', resourceId: row.id, resourceVersion: row.version, safeDiff: { changedFields: Object.keys(values) } })
      return row
    })
  }

  async addItem(input: { actor: Principal; requestId: string; marketId: number; listId: number; values: Record<string, unknown> }) {
    this.assertMarketAccess(input.actor, input.marketId)
    return this.database.transaction(async (tx) => {
      const list = await this.lockList(tx, input.marketId, input.listId)
      if (list.status !== 'DRAFT') throw new PriceListImmutableError()
      await this.requireProduct(tx, Number(input.values.productId))
      if (input.values.specificationVersionId != null) await this.requireSpecification(tx, input.marketId, Number(input.values.specificationVersionId), Number(input.values.productId))
      const normalizedValues = timestampValues(input.values)
      validateItemCombination(normalizedValues)
      const [item] = await tx.insert(priceListItems).values({ ...normalizedValues, marketId: input.marketId, priceListId: input.listId } as typeof priceListItems.$inferInsert).returning()
      const overlaps = await this.overlaps(tx, item)
      await this.audit(tx, { actor: input.actor, requestId: input.requestId, marketId: input.marketId, action: 'price_list.item_added', resourceId: list.id, resourceVersion: list.version, safeDiff: { itemId: item.id, productId: item.productId, unit: item.unit } })
      return { item, overlaps }
    })
  }

  async updateItem(input: { actor: Principal; requestId: string; marketId: number; listId: number; itemId: number; version: number; values: Record<string, unknown> }) {
    this.assertMarketAccess(input.actor, input.marketId)
    return this.database.transaction(async (tx) => {
      const list = await this.lockList(tx, input.marketId, input.listId)
      if (list.status !== 'DRAFT') throw new PriceListImmutableError()
      const [current] = await tx.select().from(priceListItems).where(and(eq(priceListItems.id, input.itemId), eq(priceListItems.marketId, input.marketId), eq(priceListItems.priceListId, input.listId))).limit(1)
      if (!current) throw new PriceListNotFoundError()
      if (current.version !== input.version) throw new PriceListConflictError()
      const values = { ...input.values } as Record<string, unknown>
      delete values.version
      if (values.productId != null) await this.requireProduct(tx, Number(values.productId))
      const revisionId = values.specificationVersionId !== undefined ? values.specificationVersionId : current.specificationVersionId
      if (revisionId != null) await this.requireSpecification(tx, input.marketId, Number(revisionId), Number(values.productId ?? current.productId))
      const normalizedValues = timestampValues(values)
      validateItemCombination({ ...current, ...normalizedValues })
      const [item] = await tx.update(priceListItems).set({ ...normalizedValues, updatedAt: new Date(), version: current.version + 1 }).where(and(eq(priceListItems.id, current.id), eq(priceListItems.version, input.version))).returning()
      if (!item) throw new PriceListConflictError()
      const overlaps = await this.overlaps(tx, item)
      await this.audit(tx, { actor: input.actor, requestId: input.requestId, marketId: input.marketId, action: 'price_list.item_updated', resourceId: list.id, resourceVersion: list.version, safeDiff: { itemId: item.id, changedFields: Object.keys(values) } })
      return { item, overlaps }
    })
  }

  async approve(input: { actor: Principal; requestId: string; marketId: number; id: number; version: number }) {
    this.assertMarketAccess(input.actor, input.marketId)
    return this.database.transaction(async (tx) => {
      const list = await this.lockList(tx, input.marketId, input.id)
      if (!canTransitionPriceList(list.status, 'APPROVED')) throw new PriceListImmutableError()
      if (list.version !== input.version) throw new PriceListConflictError()
      const items = await tx.select().from(priceListItems).where(and(eq(priceListItems.marketId, input.marketId), eq(priceListItems.priceListId, input.id)))
      if (!items.length) throw new PriceListBusinessRuleError('A price list must contain at least one item before approval')
      const [row] = await tx.update(priceLists).set({ status: 'APPROVED', approvedBy: input.actor.userId, approvedAt: new Date(), updatedAt: new Date(), version: list.version + 1 }).where(and(eq(priceLists.id, input.id), eq(priceLists.version, input.version), eq(priceLists.status, 'DRAFT'))).returning()
      if (!row) throw new PriceListConflictError()
      await this.audit(tx, { actor: input.actor, requestId: input.requestId, marketId: input.marketId, action: 'price_list.approved', resourceId: row.id, resourceVersion: row.version, safeDiff: { tier: row.tier, currency: row.currency } })
      return row
    })
  }

  async archive(input: { actor: Principal; requestId: string; marketId: number; id: number; version: number; reason: string }) {
    this.assertMarketAccess(input.actor, input.marketId)
    return this.database.transaction(async (tx) => {
      const list = await this.lockList(tx, input.marketId, input.id)
      if (!canTransitionPriceList(list.status, 'ARCHIVED')) throw new PriceListImmutableError()
      if (list.version !== input.version) throw new PriceListConflictError()
      const [row] = await tx.update(priceLists).set({ status: 'ARCHIVED', archivedAt: new Date(), archiveReason: input.reason, updatedAt: new Date(), version: list.version + 1 }).where(and(eq(priceLists.id, input.id), eq(priceLists.version, input.version))).returning()
      if (!row) throw new PriceListConflictError()
      await this.audit(tx, { actor: input.actor, requestId: input.requestId, marketId: input.marketId, action: 'price_list.archived', resourceId: row.id, resourceVersion: row.version, reason: input.reason, safeDiff: { tier: row.tier, currency: row.currency } })
      return row
    })
  }

  async eligible(input: { actor: Principal; criteria: EligibilityCriteria; executor?: Database | Transaction }) {
    const { actor, criteria } = input
    const executor = input.executor ?? this.database
    this.assertMarketAccess(actor, criteria.marketId)
    await this.requireProduct(executor, criteria.productId)
    if (criteria.customerId != null) await this.requireCustomer(executor, criteria.marketId, criteria.customerId)
    if (criteria.specificationVersionId != null) await this.requireSpecification(executor, criteria.marketId, criteria.specificationVersionId, criteria.productId)
    const rows = await this.database.select({
      id: priceListItems.id, priceListId: priceListItems.priceListId, marketId: priceListItems.marketId,
      productId: priceListItems.productId, specificationVersionId: priceListItems.specificationVersionId,
      unit: priceListItems.unit, priceBasis: priceListItems.priceBasis, unitPrice: priceListItems.unitPrice,
      priceBasisNote: priceListItems.priceBasisNote,
      minQuantity: priceListItems.minQuantity, maxQuantity: priceListItems.maxQuantity,
      itemValidFrom: priceListItems.validFrom, itemValidTo: priceListItems.validTo,
      listValidFrom: priceLists.validFrom, listValidTo: priceLists.validTo, listStatus: priceLists.status,
      tier: priceLists.tier, customerId: priceLists.customerId, currency: priceLists.currency, code: priceLists.code,
    }).from(priceListItems).innerJoin(priceLists, and(eq(priceListItems.priceListId, priceLists.id), eq(priceListItems.marketId, priceLists.marketId)))
      .where(and(eq(priceListItems.marketId, criteria.marketId), eq(priceListItems.productId, criteria.productId), eq(priceListItems.unit, criteria.unit), eq(priceLists.currency, criteria.currency)))
      .for('share', { of: [priceLists] })
    return selectEligiblePrices(rows as Parameters<typeof selectEligiblePrices>[0], criteria)
  }

  async recordSelection(input: {
    actor: Principal; requestId: string; marketId: number; values: Record<string, unknown>
  }) {
    this.assertMarketAccess(input.actor, input.marketId)
    return this.database.transaction(async (tx) => {
      const values = input.values as {
        productId: number; specificationVersionId?: number | null; priceListItemId?: number | null;
        selectedAmount: string; currency: string; unit: string; priceBasis: string; quantity: string;
        reason?: string | null; priceBasisNote?: string | null; customerId?: number | null
      }
      const eligibility = await this.eligible({ actor: input.actor, executor: tx, criteria: {
        marketId: input.marketId, productId: values.productId,
        specificationVersionId: values.specificationVersionId, customerId: values.customerId,
        quantity: values.quantity, unit: values.unit, currency: values.currency, priceBasis: values.priceBasis,
      } })
      let classification
      try {
        classification = classifyPriceSelection(values, eligibility.options)
      } catch (error) {
        if (error instanceof PriceSelectionBusinessRuleError) throw error
        throw error
      }
      if (values.priceBasis === 'OTHER' && !values.priceBasisNote?.trim()) throw new PriceListBusinessRuleError('OTHER price basis requires a note')
      const selectedItem = values.priceListItemId == null ? null : eligibility.options.find((option) => option.id === values.priceListItemId)!
      const [row] = await tx.insert(priceSelections).values({
        marketId: input.marketId, contextType: 'AD_HOC', contextId: null,
        productId: values.productId, specificationVersionId: values.specificationVersionId ?? null,
        priceListId: selectedItem?.priceListId ?? null, priceListItemId: selectedItem?.id ?? null,
        selectionType: classification.selectionType, listedAmount: classification.listedAmount,
        selectedAmount: values.selectedAmount, currency: values.currency, unit: values.unit,
        priceBasis: values.priceBasis, quantity: values.quantity, reason: classification.reason,
        sourceMetadata: { tier: selectedItem?.tier ?? null, listPriceCode: selectedItem?.code ?? null, priceBasisNote: values.priceBasisNote ?? null, eligibleAt: new Date().toISOString() },
        selectedBy: input.actor.userId, requestId: input.requestId,
      }).returning()
      await this.audit(tx, { actor: input.actor, requestId: input.requestId, marketId: input.marketId, action: 'price_selection.recorded', resourceId: row.id, resourceVersion: 1, reason: classification.reason ?? undefined, safeDiff: { productId: row.productId, priceListItemId: row.priceListItemId, selectionType: row.selectionType, unit: row.unit } })
      return row
    })
  }

  async history(actor: Principal, marketId: number, query: { contextType?: string; contextId?: number; productId?: number; priceListId?: number; limit: number }) {
    this.assertMarketAccess(actor, marketId)
    const conditions: SQL[] = [eq(priceSelections.marketId, marketId)]
    if (query.contextType) conditions.push(eq(priceSelections.contextType, query.contextType))
    if (query.contextId) conditions.push(eq(priceSelections.contextId, query.contextId))
    if (query.productId) conditions.push(eq(priceSelections.productId, query.productId))
    if (query.priceListId) conditions.push(eq(priceSelections.priceListId, query.priceListId))
    return this.database.select().from(priceSelections).where(and(...conditions))
      .orderBy(desc(priceSelections.selectedAt), desc(priceSelections.id)).limit(query.limit)
  }

  private async lockList(tx: Transaction, marketId: number, id: number) {
    const [row] = await tx.select().from(priceLists).where(and(eq(priceLists.marketId, marketId), eq(priceLists.id, id))).for('update').limit(1)
    if (!row) throw new PriceListNotFoundError()
    return row
  }

  private async requireProduct(executor: Database | Transaction, productId: number) {
    const [row] = await executor.select({ id: products.id }).from(products).where(and(eq(products.id, productId), eq(products.status, 'ACTIVE'))).limit(1)
    if (!row) throw new PriceListBusinessRuleError('Product is not available')
  }

  private async requireCustomer(executor: Database | Transaction, marketId: number, customerId: number) {
    const [row] = await executor.select({ id: customers.id }).from(customers).where(and(eq(customers.id, customerId), eq(customers.marketId, marketId), eq(customers.status, 'ACTIVE'))).limit(1)
    if (!row) throw new PriceListBusinessRuleError('Customer is not available in this market')
  }

  private async requireSpecification(executor: Database | Transaction, marketId: number, revisionId: number, productId: number) {
    const [row] = await executor.select({ id: specificationVersions.id }).from(specificationVersions).where(and(eq(specificationVersions.id, revisionId), eq(specificationVersions.marketId, marketId), eq(specificationVersions.productId, productId), eq(specificationVersions.status, 'APPROVED'))).limit(1)
    if (!row) throw new PriceListBusinessRuleError('Specification revision is not approved for this product and market')
  }

  private async overlaps(tx: Transaction, candidate: typeof priceListItems.$inferSelect) {
    const conditions: SQL[] = [
      eq(priceListItems.marketId, candidate.marketId),
      eq(priceListItems.productId, candidate.productId),
      eq(priceListItems.unit, candidate.unit),
      sql`${priceListItems.id} <> ${candidate.id}`,
      sql`(${priceListItems.validTo} IS NULL OR ${priceListItems.validTo} > ${candidate.validFrom.toISOString()}::timestamptz)`,
    ]
    if (candidate.validTo !== null) conditions.push(sql`${priceListItems.validFrom} < ${candidate.validTo.toISOString()}::timestamptz`)
    const rows = await tx.select({ id: priceListItems.id, priceListId: priceListItems.priceListId, minQuantity: priceListItems.minQuantity, maxQuantity: priceListItems.maxQuantity })
      .from(priceListItems).where(and(...conditions))
    return rows
  }

  private async audit(tx: Transaction, input: {
    actor: Principal; requestId: string; marketId: number; action: string;
    resourceId: number; resourceVersion: number; reason?: string; safeDiff: Record<string, unknown>
  }) {
    await tx.insert(auditEvents).values({
      marketId: input.marketId, actorId: input.actor.userId, action: input.action,
      resourceType: input.action.startsWith('price_selection') ? 'price_selection' : 'price_list',
      resourceId: input.resourceId, resourceVersion: input.resourceVersion,
      requestId: input.requestId, reason: input.reason, safeDiff: input.safeDiff, result: 'SUCCESS',
    })
  }
}
