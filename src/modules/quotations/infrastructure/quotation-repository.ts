import 'server-only'
import { randomUUID } from 'node:crypto'
import { and, desc, eq, gt, ilike, inArray, isNull, lte, or, sql, type SQL } from 'drizzle-orm'
import { AccessDeniedError, type EffectiveGrant, type Principal, type RecordScope } from '@/modules/access-control/domain/types'
import { requireGrant } from '@/modules/access-control/application/authorization'
import { getDatabase } from '@/modules/access-control/infrastructure/database'
import {
  auditEvents,
  customers,
  fileAttachments,
  files,
  marketProducts,
  markets,
  products,
  quotationAdjustments,
  quotationLines,
  quotationVersions,
  quotations,
  rfqLines,
  rfqs,
  specifications,
  specificationVersions,
  teamMemberships,
} from '@/modules/access-control/infrastructure/schema'
import { calculateQuotation, QuotationCalculationError } from '../domain/quotation-calculation'
import { buildSpecificationSnapshot } from '@/modules/product-specifications/domain/specification-snapshot'
import { PriceListService } from '@/modules/price-lists/application/price-list-service'
import type { PriceListTransaction } from '@/modules/price-lists/infrastructure/price-list-repository'

type Database = ReturnType<typeof getDatabase>
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]

export class QuotationNotFoundError extends Error {
  constructor() { super('Quotation not found'); this.name = 'QuotationNotFoundError' }
}

export class QuotationConflictError extends Error {
  constructor() { super('Quotation changed; reload and retry'); this.name = 'QuotationConflictError' }
}

export class QuotationImmutableError extends Error {
  constructor() { super('Only draft quotation versions may be edited'); this.name = 'QuotationImmutableError' }
}

export class QuotationBusinessRuleError extends Error {
  constructor(message: string) { super(message); this.name = 'QuotationBusinessRuleError' }
}

function safeSearch(value: string) {
  return `%${value.replace(/[\\%_]/g, '\\$&')}%`
}

function intersectOwnerIds(left: number[] | null, right: number[] | null) {
  if (left === null) return right
  if (right === null) return left
  const rightSet = new Set(right)
  return left.filter((id) => rightSet.has(id))
}

function customerScopeCondition(scope: RecordScope, actor: Principal): SQL {
  if (scope === 'ALL') return sql`true`
  if (scope === 'OWN') return eq(customers.ownerId, actor.userId)
  if (scope === 'TEAM' && actor.teamIds.length) return inArray(customers.teamId, actor.teamIds)
  return sql`false`
}

export class QuotationRepository {
  private readonly database = getDatabase()
  private readonly priceLists = new PriceListService()

  async resolveMarketId(actor: Principal, marketCode: string) {
    const [market] = await this.database.select({ id: markets.id }).from(markets)
      .where(and(eq(markets.code, marketCode), eq(markets.active, true))).limit(1)
    if (!market || !actor.marketIds.includes(market.id)) throw new AccessDeniedError()
    return market.id
  }

  private assertMarket(actor: Principal, marketId: number) {
    if (!actor.marketIds.includes(marketId)) throw new AccessDeniedError()
  }

  private async ownersForScope(executor: Database | Transaction, scope: RecordScope, actor: Principal): Promise<number[] | null> {
    if (scope === 'ALL') return null
    if (scope === 'OWN' || scope === 'ASSIGNED') return [actor.userId]
    if (scope !== 'TEAM' || !actor.teamIds.length) return []
    const now = new Date()
    const rows = await executor.select({ userId: teamMemberships.userId }).from(teamMemberships)
      .where(and(
        inArray(teamMemberships.teamId, actor.teamIds),
        lte(teamMemberships.startsAt, now),
        or(isNull(teamMemberships.endsAt), gt(teamMemberships.endsAt, now)),
      ))
    return [...new Set(rows.map((row) => row.userId))]
  }

  private async quoteOwners(executor: Database | Transaction, actor: Principal, grants: EffectiveGrant[], action: 'read' | 'create' | 'edit') {
    const quotationGrant = requireGrant(grants, 'quotations', action)
    const rfqGrant = requireGrant(grants, 'rfqs', 'read')
    const [quotationOwners, rfqOwners] = await Promise.all([
      this.ownersForScope(executor, quotationGrant.scope, actor),
      this.ownersForScope(executor, rfqGrant.scope, actor),
    ])
    return intersectOwnerIds(quotationOwners, rfqOwners)
  }

  private async assertCustomerRead(grants: EffectiveGrant[]) {
    return requireGrant(grants, 'customers', 'read')
  }

  private async audit(tx: Transaction, input: {
    actor: Principal
    requestId: string
    marketId: number
    action: string
    resourceType: string
    resourceId: number
    resourceVersion: number
    safeDiff: Record<string, unknown>
  }) {
    await tx.insert(auditEvents).values({
      marketId: input.marketId,
      actorId: input.actor.userId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      resourceVersion: input.resourceVersion,
      requestId: input.requestId,
      safeDiff: input.safeDiff,
      result: 'SUCCESS',
    })
  }

  async listRfqOptions(input: {
    actor: Principal
    grants: EffectiveGrant[]
    marketId: number
    query?: string
    limit: number
  }) {
    this.assertMarket(input.actor, input.marketId)
    const ownerIds = await this.quoteOwners(this.database, input.actor, input.grants, 'create')
    const customerGrant = await this.assertCustomerRead(input.grants)
    const conditions: SQL[] = [
      eq(rfqs.marketId, input.marketId),
      eq(customers.marketId, input.marketId),
      customerScopeCondition(customerGrant.scope, input.actor),
      sql`${rfqs.status} NOT IN ('CLOSED', 'CANCELLED')`,
    ]
    if (ownerIds !== null) conditions.push(ownerIds.length ? inArray(rfqs.ownerId, ownerIds) : sql`false`)
    if (input.query?.trim()) {
      const pattern = safeSearch(input.query.trim())
      conditions.push(or(ilike(rfqs.number, pattern), ilike(customers.code, pattern), ilike(customers.legalName, pattern), ilike(customers.tradeName, pattern))!)
    }
    return this.database.select({
      id: rfqs.id,
      number: rfqs.number,
      customerId: rfqs.customerId,
      customerCode: customers.code,
      customerName: customers.tradeName,
      customerLegalName: customers.legalName,
      ownerId: rfqs.ownerId,
      status: rfqs.status,
      responseDueAt: rfqs.responseDueAt,
      receivedAt: rfqs.receivedAt,
    }).from(rfqs).innerJoin(customers, and(eq(customers.id, rfqs.customerId), eq(customers.marketId, rfqs.marketId)))
      .where(and(...conditions)).orderBy(desc(rfqs.createdAt), desc(rfqs.id)).limit(input.limit)
  }

  async list(input: {
    actor: Principal
    grants: EffectiveGrant[]
    marketId: number
    query?: string
    rfqId?: number
    limit: number
  }) {
    this.assertMarket(input.actor, input.marketId)
    const ownerIds = await this.quoteOwners(this.database, input.actor, input.grants, 'read')
    const customerGrant = await this.assertCustomerRead(input.grants)
    const conditions: SQL[] = [
      eq(quotations.marketId, input.marketId),
      eq(rfqs.marketId, input.marketId),
      eq(customers.marketId, input.marketId),
      customerScopeCondition(customerGrant.scope, input.actor),
    ]
    if (ownerIds !== null) conditions.push(ownerIds.length ? inArray(quotations.ownerId, ownerIds) : sql`false`)
    if (input.rfqId) conditions.push(eq(quotations.rfqId, input.rfqId))
    if (input.query?.trim()) {
      const pattern = safeSearch(input.query.trim())
      conditions.push(or(ilike(quotations.number, pattern), ilike(rfqs.number, pattern), ilike(customers.code, pattern), ilike(customers.legalName, pattern), ilike(customers.tradeName, pattern))!)
    }
    const rows = await this.database.select({
      id: quotations.id,
      marketId: quotations.marketId,
      rfqId: quotations.rfqId,
      number: quotations.number,
      ownerId: quotations.ownerId,
      version: quotations.version,
      createdAt: quotations.createdAt,
      updatedAt: quotations.updatedAt,
      rfqNumber: rfqs.number,
      customerId: rfqs.customerId,
      customerCode: customers.code,
      customerName: customers.tradeName,
      customerLegalName: customers.legalName,
    }).from(quotations)
      .innerJoin(rfqs, and(eq(rfqs.id, quotations.rfqId), eq(rfqs.marketId, quotations.marketId)))
      .innerJoin(customers, and(eq(customers.id, rfqs.customerId), eq(customers.marketId, rfqs.marketId)))
      .where(and(...conditions)).orderBy(desc(quotations.createdAt), desc(quotations.id)).limit(input.limit)
    const versionRows = rows.length ? await this.database.select().from(quotationVersions)
      .where(and(eq(quotationVersions.marketId, input.marketId), inArray(quotationVersions.quotationId, rows.map((row) => row.id))))
      .orderBy(desc(quotationVersions.revisionNo), desc(quotationVersions.id)) : []
    const latest = new Map<number, (typeof versionRows)[number]>()
    for (const row of versionRows) if (!latest.has(row.quotationId)) latest.set(row.quotationId, row)
    return rows.map((row) => ({ ...row, latestVersion: latest.get(row.id) ?? null }))
  }

  async get(input: { actor: Principal; grants: EffectiveGrant[]; marketId: number; id: number }) {
    this.assertMarket(input.actor, input.marketId)
    const ownerIds = await this.quoteOwners(this.database, input.actor, input.grants, 'read')
    const customerGrant = await this.assertCustomerRead(input.grants)
    const conditions: SQL[] = [eq(quotations.marketId, input.marketId), eq(quotations.id, input.id), eq(customers.marketId, input.marketId), customerScopeCondition(customerGrant.scope, input.actor)]
    if (ownerIds !== null) conditions.push(ownerIds.length ? inArray(quotations.ownerId, ownerIds) : sql`false`)
    const [quotation] = await this.database.select({
      id: quotations.id,
      marketId: quotations.marketId,
      rfqId: quotations.rfqId,
      number: quotations.number,
      ownerId: quotations.ownerId,
      version: quotations.version,
      createdAt: quotations.createdAt,
      updatedAt: quotations.updatedAt,
      rfqNumber: rfqs.number,
      customerId: rfqs.customerId,
      customerCode: customers.code,
      customerName: customers.tradeName,
      customerLegalName: customers.legalName,
    }).from(quotations)
      .innerJoin(rfqs, and(eq(rfqs.id, quotations.rfqId), eq(rfqs.marketId, quotations.marketId)))
      .innerJoin(customers, and(eq(customers.id, rfqs.customerId), eq(customers.marketId, rfqs.marketId)))
      .where(and(...conditions)).limit(1)
    if (!quotation) throw new QuotationNotFoundError()
    const versions = await this.database.select().from(quotationVersions)
      .where(and(eq(quotationVersions.marketId, input.marketId), eq(quotationVersions.quotationId, quotation.id)))
      .orderBy(desc(quotationVersions.revisionNo), desc(quotationVersions.id))
    const versionIds = versions.map((version) => version.id)
    const lines = versionIds.length ? await this.database.select().from(quotationLines)
      .where(and(eq(quotationLines.marketId, input.marketId), inArray(quotationLines.quotationVersionId, versionIds)))
      .orderBy(quotationLines.lineNo) : []
    const adjustments = versionIds.length ? await this.database.select().from(quotationAdjustments)
      .where(and(eq(quotationAdjustments.marketId, input.marketId), inArray(quotationAdjustments.quotationVersionId, versionIds))) : []
    return {
      ...quotation,
      versions: versions.map((version) => ({
        ...version,
        lines: lines.filter((line) => line.quotationVersionId === version.id),
        adjustments: adjustments.filter((adjustment) => adjustment.quotationVersionId === version.id),
      })),
    }
  }

  private async findAuthorizedRfq(input: {
    executor: Database | Transaction
    actor: Principal
    grants: EffectiveGrant[]
    marketId: number
    rfqId: number
    action: 'read' | 'create'
  }) {
    const ownerIds = await this.quoteOwners(input.executor, input.actor, input.grants, input.action)
    const customerGrant = await this.assertCustomerRead(input.grants)
    const conditions: SQL[] = [
      eq(rfqs.id, input.rfqId), eq(rfqs.marketId, input.marketId),
      eq(customers.marketId, input.marketId), customerScopeCondition(customerGrant.scope, input.actor),
    ]
    if (ownerIds !== null) conditions.push(ownerIds.length ? inArray(rfqs.ownerId, ownerIds) : sql`false`)
    const [rfq] = await input.executor.select({
      id: rfqs.id, marketId: rfqs.marketId, number: rfqs.number,
      customerId: rfqs.customerId, ownerId: rfqs.ownerId, status: rfqs.status,
      version: rfqs.version, customerCode: customers.code,
    }).from(rfqs).innerJoin(customers, and(eq(customers.id, rfqs.customerId), eq(customers.marketId, rfqs.marketId)))
      .where(and(...conditions)).limit(1)
    if (!rfq) throw new QuotationNotFoundError()
    return rfq
  }

  async create(input: { actor: Principal; grants: EffectiveGrant[]; requestId: string; marketId: number; rfqId: number }) {
    this.assertMarket(input.actor, input.marketId)
    return this.database.transaction(async (tx) => {
      const rfq = await this.findAuthorizedRfq({ executor: tx, actor: input.actor, grants: input.grants, marketId: input.marketId, rfqId: input.rfqId, action: 'create' })
      if (rfq.status === 'CLOSED' || rfq.status === 'CANCELLED') throw new QuotationBusinessRuleError('A closed or cancelled RFQ cannot receive a new quotation alternative')
      const temporaryNumber = `draft-${randomUUID()}`
      const [created] = await tx.insert(quotations).values({ marketId: input.marketId, rfqId: rfq.id, number: temporaryNumber, ownerId: rfq.ownerId }).returning()
      const [quotation] = await tx.update(quotations).set({ number: `QT-${created.id}` }).where(and(eq(quotations.id, created.id), eq(quotations.marketId, input.marketId))).returning()
      const [version] = await tx.insert(quotationVersions).values({
        marketId: input.marketId, quotationId: quotation.id, rfqId: rfq.id,
        revisionNo: 1, state: 'DRAFT', currency: 'USD', createdBy: input.actor.userId,
      }).returning()
      await this.audit(tx, { actor: input.actor, requestId: input.requestId, marketId: input.marketId, action: 'quotation.draft_created', resourceType: 'quotation', resourceId: quotation.id, resourceVersion: quotation.version, safeDiff: { rfqId: rfq.id, quotationVersionId: version.id } })
      await this.audit(tx, { actor: input.actor, requestId: input.requestId, marketId: input.marketId, action: 'quotation.revision_created', resourceType: 'quotation_version', resourceId: version.id, resourceVersion: version.version, safeDiff: { quotationId: quotation.id, revisionNo: version.revisionNo } })
      return { ...quotation, rfqNumber: rfq.number, customerId: rfq.customerId, customerCode: rfq.customerCode, latestVersion: version }
    })
  }

  async cloneLatestRevision(input: { actor: Principal; grants: EffectiveGrant[]; requestId: string; marketId: number; quotationId: number; expectedVersion: number }) {
    this.assertMarket(input.actor, input.marketId)
    return this.database.transaction(async (tx) => {
      const quote = await this.lockQuotation(tx, input.actor, input.grants, input.marketId, input.quotationId)
      if (quote.version !== input.expectedVersion) throw new QuotationConflictError()
      const [source] = await tx.select().from(quotationVersions)
        .where(and(eq(quotationVersions.marketId, input.marketId), eq(quotationVersions.quotationId, quote.id)))
        .orderBy(desc(quotationVersions.revisionNo), desc(quotationVersions.id)).limit(1).for('update')
      if (!source) throw new QuotationNotFoundError()
      const [version] = await tx.insert(quotationVersions).values({
        marketId: source.marketId, quotationId: source.quotationId, rfqId: source.rfqId,
        revisionNo: source.revisionNo + 1, state: 'DRAFT', currency: source.currency,
        vndPerUsd: source.vndPerUsd, fxSource: source.fxSource, fxAt: source.fxAt,
        incoterm: source.incoterm, incotermPlace: source.incotermPlace, incotermYear: source.incotermYear,
        paymentTerms: source.paymentTerms, validUntil: source.validUntil,
        originalUsdTotal: source.originalUsdTotal, originalVndTotal: source.originalVndTotal,
        unroundedUsdTotal: source.unroundedUsdTotal, unroundedUsdNumerator: source.unroundedUsdNumerator,
        unroundedUsdDenominator: source.unroundedUsdDenominator, roundedUsdTotal: source.roundedUsdTotal,
        createdBy: input.actor.userId,
      }).returning()
      const sourceLines = await tx.select().from(quotationLines)
        .where(and(eq(quotationLines.marketId, input.marketId), eq(quotationLines.quotationVersionId, source.id)))
        .orderBy(quotationLines.lineNo)
      for (const line of sourceLines) {
        await tx.insert(quotationLines).values({
          ...line, id: undefined, quotationVersionId: version.id,
        })
      }
      const sourceAdjustments = await tx.select().from(quotationAdjustments)
        .where(and(eq(quotationAdjustments.marketId, input.marketId), eq(quotationAdjustments.quotationVersionId, source.id)))
      for (const adjustment of sourceAdjustments) {
        await tx.insert(quotationAdjustments).values({
          ...adjustment, id: undefined, quotationVersionId: version.id,
        })
      }
      const [updatedQuote] = await tx.update(quotations).set({ version: quote.version + 1, updatedAt: new Date() })
        .where(and(eq(quotations.id, quote.id), eq(quotations.version, quote.version))).returning()
      if (!updatedQuote) throw new QuotationConflictError()
      await this.audit(tx, { actor: input.actor, requestId: input.requestId, marketId: input.marketId, action: 'quotation.revision_cloned', resourceType: 'quotation_version', resourceId: version.id, resourceVersion: version.version, safeDiff: { quotationId: quote.id, sourceVersionId: source.id, revisionNo: version.revisionNo } })
      return version
    })
  }

  private async lockQuotation(tx: Transaction, actor: Principal, grants: EffectiveGrant[], marketId: number, id: number) {
    this.assertMarket(actor, marketId)
    const ownerIds = await this.quoteOwners(tx, actor, grants, 'edit')
    const conditions: SQL[] = [eq(quotations.marketId, marketId), eq(quotations.id, id)]
    if (ownerIds !== null) conditions.push(ownerIds.length ? inArray(quotations.ownerId, ownerIds) : sql`false`)
    const [quote] = await tx.select().from(quotations).where(and(...conditions)).for('update').limit(1)
    if (!quote) throw new QuotationNotFoundError()
    await this.findAuthorizedRfq({ executor: tx, actor, grants, marketId, rfqId: quote.rfqId, action: 'read' })
    return quote
  }

  private async lockVersion(tx: Transaction, actor: Principal, grants: EffectiveGrant[], marketId: number, versionId: number) {
    const [candidate] = await tx.select({ quotationId: quotationVersions.quotationId }).from(quotationVersions)
      .where(and(eq(quotationVersions.marketId, marketId), eq(quotationVersions.id, versionId))).limit(1)
    if (!candidate) throw new QuotationNotFoundError()
    const quote = await this.lockQuotation(tx, actor, grants, marketId, candidate.quotationId)
    const [version] = await tx.select().from(quotationVersions)
      .where(and(eq(quotationVersions.marketId, marketId), eq(quotationVersions.id, versionId), eq(quotationVersions.quotationId, quote.id)))
      .for('update').limit(1)
    if (!version) throw new QuotationNotFoundError()
    if (version.state !== 'DRAFT') throw new QuotationImmutableError()
    return { quote, version }
  }

  private async assertProduct(tx: Transaction, marketId: number, productId: number) {
    const [product] = await tx.select().from(products).innerJoin(marketProducts, and(
      eq(marketProducts.productId, products.id), eq(marketProducts.marketId, marketId), eq(marketProducts.eligible, true),
    )).where(and(eq(products.id, productId), eq(products.status, 'ACTIVE'))).limit(1)
    if (!product) throw new QuotationBusinessRuleError('SKU is not active and eligible in this market')
    return product.products
  }

  private async snapshots(tx: Transaction, marketId: number, customerId: number, productId: number | null, specificationVersionId: number | null) {
    let productSnapshot: Record<string, unknown> | null = null
    let specificationSnapshot: Record<string, unknown> | null = null
    if (productId !== null) {
      const product = await this.assertProduct(tx, marketId, productId)
      productSnapshot = {
        productId: product.id,
        sku: product.sku,
        displayName: product.displayName,
        defaultUnit: product.defaultUnit,
        descriptionEn: product.descriptionEn,
        descriptionVi: product.descriptionVi,
        descriptionKo: product.descriptionKo,
      }
    }
    if (specificationVersionId !== null) {
      if (productId === null) throw new QuotationBusinessRuleError('Select a SKU before selecting its specification revision')
      const [revision] = await tx.select().from(specificationVersions)
        .where(and(
          eq(specificationVersions.marketId, marketId),
          eq(specificationVersions.productId, productId),
          eq(specificationVersions.id, specificationVersionId),
          eq(specificationVersions.status, 'APPROVED'),
        )).limit(1)
      if (!revision) throw new QuotationBusinessRuleError('Specification Revision must be approved and belong to the selected SKU and market')
      const [specification] = await tx.select().from(specifications)
        .where(and(eq(specifications.marketId, marketId), eq(specifications.id, revision.specificationId), eq(specifications.active, true), or(isNull(specifications.customerId), eq(specifications.customerId, customerId)))).limit(1)
      if (!specification) throw new QuotationBusinessRuleError('Specification is archived or outside this market')
      const documents = await tx.select({
        fileId: files.id, purpose: fileAttachments.purpose, originalName: files.originalName,
        mediaType: files.mediaType, byteSize: files.byteSize, sha256: files.sha256, createdAt: files.createdAt,
      }).from(fileAttachments).innerJoin(files, eq(files.id, fileAttachments.fileId))
        .where(and(eq(fileAttachments.marketId, marketId), eq(fileAttachments.specificationVersionId, revision.id), eq(files.scanState, 'CLEAN')))
      const snapshot = buildSpecificationSnapshot({
        revision, specification, product: { id: productId, sku: productSnapshot?.sku as string, names: { en: productSnapshot?.displayName as string } },
        documents, capturedAt: new Date(),
      })
      specificationSnapshot = snapshot as unknown as Record<string, unknown>
    }
    return { productSnapshot, specificationSnapshot }
  }

  private async assertRfqLine(tx: Transaction, marketId: number, rfqId: number, rfqLineId: number, productId: number | null) {
    const [line] = await tx.select().from(rfqLines)
      .where(and(eq(rfqLines.marketId, marketId), eq(rfqLines.rfqId, rfqId), eq(rfqLines.id, rfqLineId))).limit(1)
    if (!line) throw new QuotationBusinessRuleError('RFQ line does not belong to the authorized RFQ')
    if (line.productId !== null && productId !== null && line.productId !== productId) {
      throw new QuotationBusinessRuleError('Offered SKU must match the mapped RFQ line')
    }
    return line
  }

  private completeLine(line: {
    quantity: string | null
    inputUnitPrice: string | null
    inputCurrency: string | null
  }) {
    return line.quantity !== null && line.inputUnitPrice !== null && line.inputCurrency !== null
  }

  private async refreshCalculation(tx: Transaction, version: typeof quotationVersions.$inferSelect) {
    const lines = await tx.select().from(quotationLines)
      .where(and(eq(quotationLines.marketId, version.marketId), eq(quotationLines.quotationVersionId, version.id)))
      .orderBy(quotationLines.lineNo)
    const adjustments = await tx.select().from(quotationAdjustments)
      .where(and(eq(quotationAdjustments.marketId, version.marketId), eq(quotationAdjustments.quotationVersionId, version.id)))
    const completeLines = lines.filter((line) => this.completeLine(line))
    const calculation = calculateQuotation({
      lines: completeLines.map((line) => ({
        quantity: line.quantity!, unitPrice: line.inputUnitPrice!, currency: line.inputCurrency as 'USD' | 'VND',
      })),
      adjustments: adjustments.map((adjustment) => ({ currency: adjustment.inputCurrency as 'USD' | 'VND', amount: adjustment.originalAmount })),
      vndPerUsd: version.vndPerUsd,
    })
    for (const [index, line] of completeLines.entries()) {
      await tx.update(quotationLines).set({
        originalLineAmount: calculation.lines[index].originalAmount,
        convertedUsdAmount: calculation.lines[index].convertedUsdAmount,
      }).where(and(eq(quotationLines.marketId, version.marketId), eq(quotationLines.id, line.id)))
    }
    for (const line of lines.filter((row) => !this.completeLine(row))) {
      await tx.update(quotationLines).set({ originalLineAmount: null, convertedUsdAmount: null })
        .where(and(eq(quotationLines.marketId, version.marketId), eq(quotationLines.id, line.id)))
    }
    for (const adjustment of adjustments) {
      const converted = calculateQuotation({
        lines: [{ quantity: '1', unitPrice: adjustment.originalAmount, currency: adjustment.inputCurrency as 'USD' | 'VND' }],
        adjustments: [],
        vndPerUsd: version.vndPerUsd,
      }).lines[0].convertedUsdAmount
      await tx.update(quotationAdjustments).set({ convertedUsdAmount: converted })
        .where(and(eq(quotationAdjustments.marketId, version.marketId), eq(quotationAdjustments.id, adjustment.id)))
    }
    const [updated] = await tx.update(quotationVersions).set({
      originalUsdTotal: calculation.originalUsdTotal,
      originalVndTotal: calculation.originalVndTotal,
      unroundedUsdTotal: calculation.unroundedUsdTotal,
      unroundedUsdNumerator: calculation.unroundedUsdNumerator,
      unroundedUsdDenominator: calculation.unroundedUsdDenominator,
      roundedUsdTotal: calculation.roundedUsdTotal,
      updatedAt: new Date(),
    }).where(and(eq(quotationVersions.marketId, version.marketId), eq(quotationVersions.id, version.id))).returning()
    return { version: updated, calculation, incompleteLineIds: lines.filter((line) => !this.completeLine(line)).map((line) => line.id) }
  }

  private async bumpParent(tx: Transaction, quote: typeof quotations.$inferSelect) {
    const [updated] = await tx.update(quotations).set({ version: quote.version + 1, updatedAt: new Date() })
      .where(and(eq(quotations.id, quote.id), eq(quotations.marketId, quote.marketId), eq(quotations.version, quote.version))).returning()
    if (!updated) throw new QuotationConflictError()
    return updated
  }

  async updateVersion(input: {
    actor: Principal; grants: EffectiveGrant[]; requestId: string; marketId: number; versionId: number;
    expectedVersion: number; values: Record<string, unknown>
  }) {
    return this.database.transaction(async (tx) => {
      const { quote, version } = await this.lockVersion(tx, input.actor, input.grants, input.marketId, input.versionId)
      if (version.version !== input.expectedVersion) throw new QuotationConflictError()
      const values = input.values
      const updates: Record<string, unknown> = { ...values, version: version.version + 1, updatedAt: new Date() }
      if (typeof updates.validUntil === 'string') updates.validUntil = new Date(updates.validUntil)
      if (typeof updates.vndPerUsd === 'string') {
        updates.fxAt = new Date()
        updates.fxSource = 'MANUAL'
      }
      if (updates.vndPerUsd === null) {
        const [hasVnd] = await tx.select({ id: quotationLines.id }).from(quotationLines)
          .where(and(eq(quotationLines.marketId, input.marketId), eq(quotationLines.quotationVersionId, version.id), eq(quotationLines.inputCurrency, 'VND'))).limit(1)
        const [hasVndAdjustment] = await tx.select({ id: quotationAdjustments.id }).from(quotationAdjustments)
          .where(and(eq(quotationAdjustments.marketId, input.marketId), eq(quotationAdjustments.quotationVersionId, version.id), eq(quotationAdjustments.inputCurrency, 'VND'))).limit(1)
        if (hasVnd || hasVndAdjustment) throw new QuotationBusinessRuleError('Remove VND inputs before clearing the revision rate')
        updates.fxAt = null
        updates.fxSource = null
      }
      const [updatedVersion] = await tx.update(quotationVersions).set(updates)
        .where(and(eq(quotationVersions.marketId, input.marketId), eq(quotationVersions.id, version.id), eq(quotationVersions.version, version.version))).returning()
      if (!updatedVersion) throw new QuotationConflictError()
      const result = await this.refreshCalculation(tx, updatedVersion)
      const updatedQuote = await this.bumpParent(tx, quote)
      await this.audit(tx, { actor: input.actor, requestId: input.requestId, marketId: input.marketId, action: 'quotation.draft_updated', resourceType: 'quotation_version', resourceId: version.id, resourceVersion: result.version.version, safeDiff: { changedFields: Object.keys(values), quotationVersion: version.revisionNo } })
      return { quotationId: updatedQuote.id, ...result }
    })
  }

  private async writeLine(input: {
    actor: Principal; grants: EffectiveGrant[]; requestId: string; marketId: number; versionId: number;
    lineId?: number; expectedVersion: number; values: Record<string, unknown>
  }) {
    return this.database.transaction(async (tx) => {
      const { quote, version } = await this.lockVersion(tx, input.actor, input.grants, input.marketId, input.versionId)
      if (version.version !== input.expectedVersion) throw new QuotationConflictError()
      const { version: ignored, ...values } = input.values
      let existing: typeof quotationLines.$inferSelect | null = null
      if (input.lineId) {
        const [row] = await tx.select().from(quotationLines).where(and(
          eq(quotationLines.marketId, input.marketId), eq(quotationLines.quotationVersionId, version.id), eq(quotationLines.id, input.lineId),
        )).for('update').limit(1)
        if (!row) throw new QuotationNotFoundError()
        existing = row
      }
      const merged = { ...(existing ?? {}), ...values } as typeof quotationLines.$inferSelect
      if (merged.rfqLineId != null) await this.assertRfqLine(tx, input.marketId, version.rfqId, merged.rfqLineId, merged.productId)
      const authorizedRfq = await this.findAuthorizedRfq({ executor: tx, actor: input.actor, grants: input.grants, marketId: input.marketId, rfqId: version.rfqId, action: 'read' })
      const snapshots = existing && merged.productId === existing.productId && merged.specificationVersionId === existing.specificationVersionId
        ? { productSnapshot: existing.productSnapshot, specificationSnapshot: existing.specificationSnapshot }
        : await this.snapshots(tx, input.marketId, authorizedRfq.customerId, merged.productId ?? null, merged.specificationVersionId ?? null)
      const now = new Date()
      let originalLineAmount: string | null = null
      let convertedUsdAmount: string | null = null
      const complete = this.completeLine(merged)
      const pricingTouched = !existing || ['quantity', 'unit', 'inputCurrency', 'inputUnitPrice', 'priceBasis', 'priceBasisNote', 'priceListItemId', 'priceReason', 'productId', 'specificationVersionId'].some((key) => key in values)
      const selectionReady = merged.productId != null && merged.unit != null && merged.priceBasis != null
      const recordSelection = complete && selectionReady && pricingTouched
      if (complete) {
        const calculated = calculateQuotation({ lines: [{ quantity: merged.quantity!, unitPrice: merged.inputUnitPrice!, currency: merged.inputCurrency as 'USD' | 'VND' }], adjustments: [], vndPerUsd: version.vndPerUsd })
        originalLineAmount = calculated.lines[0].originalAmount
        convertedUsdAmount = calculated.lines[0].convertedUsdAmount
      }
      const changes = {
        ...values,
        ...snapshots,
        originalLineAmount,
        convertedUsdAmount,
        ...(pricingTouched && !recordSelection ? {
          priceListItemId: null,
          priceSelectionId: null,
          referencePrice: null,
          referenceCurrency: null,
          selectedBy: null,
          selectedAt: null,
        } : {}),
        ...(recordSelection ? { selectedBy: input.actor.userId, selectedAt: now } : {}),
      }
      let line: typeof quotationLines.$inferSelect
      if (existing) {
        const [updated] = await tx.update(quotationLines).set(changes).where(and(eq(quotationLines.marketId, input.marketId), eq(quotationLines.id, existing.id))).returning()
        line = updated
      } else {
        const [last] = await tx.select({ maxLineNo: sql<number>`coalesce(max(${quotationLines.lineNo}), 0)` }).from(quotationLines)
          .where(and(eq(quotationLines.marketId, input.marketId), eq(quotationLines.quotationVersionId, version.id)))
        const [created] = await tx.insert(quotationLines).values({
          marketId: input.marketId,
          quotationVersionId: version.id,
          rfqId: version.rfqId,
          rfqLineId: merged.rfqLineId ?? null,
          lineNo: (last?.maxLineNo ?? 0) + 1,
          productId: merged.productId ?? null,
          specificationVersionId: merged.specificationVersionId ?? null,
          quantity: merged.quantity ?? null,
          unit: merged.unit ?? null,
          inputCurrency: merged.inputCurrency ?? null,
          inputUnitPrice: merged.inputUnitPrice ?? null,
          originalLineAmount,
          convertedUsdAmount,
          priceListItemId: null,
          referencePrice: null,
          referenceCurrency: null,
          priceReason: merged.priceReason ?? null,
          priceBasis: merged.priceBasis ?? null,
          priceBasisNote: merged.priceBasisNote ?? null,
          productSnapshot: snapshots.productSnapshot,
          specificationSnapshot: snapshots.specificationSnapshot,
          selectedBy: recordSelection ? input.actor.userId : null,
          selectedAt: recordSelection ? now : null,
        }).returning()
        line = created
      }
      if (recordSelection) {
        const selection = await this.priceLists.recordQuotationLineSelection(input.actor, input.grants, input.marketId, line.id, {
          productId: merged.productId!,
          specificationVersionId: merged.specificationVersionId ?? null,
          priceListItemId: merged.priceListItemId ?? null,
          selectedAmount: merged.inputUnitPrice!,
          currency: merged.inputCurrency!,
          unit: merged.unit!,
          priceBasis: merged.priceBasis!,
          quantity: merged.quantity!,
          reason: merged.priceReason ?? null,
          priceBasisNote: merged.priceBasisNote ?? null,
          customerId: authorizedRfq.customerId,
        }, input.requestId, tx as PriceListTransaction)
        const [refreshed] = await tx.select().from(quotationLines).where(eq(quotationLines.id, line.id)).limit(1)
        const [updatedLine] = await tx.update(quotationLines).set({
          priceListItemId: selection.row.priceListItemId,
          priceSelectionId: selection.row.id,
          referencePrice: selection.classification.listedAmount,
          referenceCurrency: selection.classification.listedAmount === null ? null : merged.inputCurrency,
          priceReason: selection.classification.reason,
          selectedBy: input.actor.userId,
          selectedAt: now,
        }).where(and(eq(quotationLines.marketId, input.marketId), eq(quotationLines.id, refreshed.id))).returning()
        line = updatedLine
      }
      const calculation = await this.refreshCalculation(tx, version)
      await tx.update(quotationVersions).set({ version: version.version + 1, updatedAt: new Date() })
        .where(and(eq(quotationVersions.id, version.id), eq(quotationVersions.version, version.version)))
      const updatedQuote = await this.bumpParent(tx, quote)
      await this.audit(tx, { actor: input.actor, requestId: input.requestId, marketId: input.marketId, action: existing ? 'quotation.line_updated' : 'quotation.line_added', resourceType: 'quotation_line', resourceId: line.id, resourceVersion: calculation.version.version, safeDiff: { quotationVersionId: version.id, lineNo: line.lineNo, changedFields: Object.keys(values), quotationId: updatedQuote.id } })
      return { line, calculation: calculation.calculation, incompleteLineIds: calculation.incompleteLineIds }
    })
  }

  createLine(input: Parameters<QuotationRepository['writeLine']>[0]) {
    return this.writeLine(input)
  }

  updateLine(input: Parameters<QuotationRepository['writeLine']>[0]) {
    return this.writeLine(input)
  }

  async setAdjustment(input: {
    actor: Principal; grants: EffectiveGrant[]; requestId: string; marketId: number; versionId: number;
    kind: 'FREIGHT' | 'INSURANCE'; expectedVersion: number; amount: string | null; currency?: 'USD' | 'VND'
  }) {
    return this.database.transaction(async (tx) => {
      const { quote, version } = await this.lockVersion(tx, input.actor, input.grants, input.marketId, input.versionId)
      if (version.version !== input.expectedVersion) throw new QuotationConflictError()
      if (input.amount === null) {
        await tx.delete(quotationAdjustments).where(and(eq(quotationAdjustments.marketId, input.marketId), eq(quotationAdjustments.quotationVersionId, version.id), eq(quotationAdjustments.kind, input.kind)))
      } else {
        if (!input.currency) throw new QuotationBusinessRuleError('Adjustment currency is required')
        const convertedUsdAmount = calculateQuotation({ lines: [{ quantity: '1', unitPrice: input.amount, currency: input.currency }], adjustments: [], vndPerUsd: version.vndPerUsd }).lines[0].convertedUsdAmount
        await tx.insert(quotationAdjustments).values({
          marketId: input.marketId, quotationVersionId: version.id, kind: input.kind,
          inputCurrency: input.currency, originalAmount: input.amount, convertedUsdAmount,
        }).onConflictDoUpdate({
          target: [quotationAdjustments.marketId, quotationAdjustments.quotationVersionId, quotationAdjustments.kind],
          set: { inputCurrency: input.currency, originalAmount: input.amount, convertedUsdAmount },
        })
      }
      await tx.update(quotationVersions).set({ version: version.version + 1, updatedAt: new Date() })
        .where(and(eq(quotationVersions.id, version.id), eq(quotationVersions.version, version.version)))
      const [freshVersion] = await tx.select().from(quotationVersions).where(eq(quotationVersions.id, version.id)).limit(1)
      const result = await this.refreshCalculation(tx, freshVersion)
      await this.bumpParent(tx, quote)
      await this.audit(tx, { actor: input.actor, requestId: input.requestId, marketId: input.marketId, action: 'quotation.adjustment_updated', resourceType: 'quotation_version', resourceId: version.id, resourceVersion: result.version.version, safeDiff: { adjustmentKind: input.kind, quotationId: quote.id } })
      return result
    })
  }

  async calculate(input: { actor: Principal; grants: EffectiveGrant[]; requestId: string; marketId: number; versionId: number; expectedVersion: number }) {
    return this.database.transaction(async (tx) => {
      const { quote, version } = await this.lockVersion(tx, input.actor, input.grants, input.marketId, input.versionId)
      if (version.version !== input.expectedVersion) throw new QuotationConflictError()
      const [updatedVersion] = await tx.update(quotationVersions).set({ version: version.version + 1, updatedAt: new Date() })
        .where(and(eq(quotationVersions.id, version.id), eq(quotationVersions.version, version.version))).returning()
      const result = await this.refreshCalculation(tx, updatedVersion)
      await this.bumpParent(tx, quote)
      await this.audit(tx, { actor: input.actor, requestId: input.requestId, marketId: input.marketId, action: 'quotation.calculated', resourceType: 'quotation_version', resourceId: version.id, resourceVersion: result.version.version, safeDiff: { quotationId: quote.id } })
      return result
    })
  }

  async readiness(input: { actor: Principal; grants: EffectiveGrant[]; marketId: number; versionId: number }) {
    const [candidate] = await this.database.select().from(quotationVersions).where(and(eq(quotationVersions.marketId, input.marketId), eq(quotationVersions.id, input.versionId))).limit(1)
    if (!candidate) throw new QuotationNotFoundError()
    const quotation = await this.get({ actor: input.actor, grants: input.grants, marketId: input.marketId, id: candidate.quotationId })
    const lines = await this.database.select().from(quotationLines).where(and(eq(quotationLines.marketId, input.marketId), eq(quotationLines.quotationVersionId, candidate.id))).orderBy(quotationLines.lineNo)
    const issues: Array<{ lineId: number | null; lineNo: number | null; code: string; message: string }> = []
    if (!lines.length) issues.push({ lineId: null, lineNo: null, code: 'NO_COMMERCIAL_LINES', message: 'Add at least one commercial line' })
    for (const line of lines) {
      if (line.productId === null) {
        issues.push({ lineId: line.id, lineNo: line.lineNo, code: 'SKU_REQUIRED', message: 'Select an active SKU eligible in this market' })
      } else {
        const [product] = await this.database.select({ id: products.id }).from(products).innerJoin(marketProducts, and(
          eq(marketProducts.productId, products.id), eq(marketProducts.marketId, input.marketId), eq(marketProducts.eligible, true),
        )).where(and(eq(products.id, line.productId), eq(products.status, 'ACTIVE'))).limit(1)
        if (!product) issues.push({ lineId: line.id, lineNo: line.lineNo, code: 'SKU_INELIGIBLE', message: 'The selected SKU is inactive or no longer eligible in this market' })
      }
      if (line.specificationVersionId === null) {
        issues.push({ lineId: line.id, lineNo: line.lineNo, code: 'SPECIFICATION_REVISION_REQUIRED', message: 'Select an approved Specification Revision for this SKU' })
      } else if (line.productId !== null) {
        const [revision] = await this.database.select({ id: specificationVersions.id }).from(specificationVersions)
          .innerJoin(specifications, and(eq(specifications.id, specificationVersions.specificationId), eq(specifications.marketId, specificationVersions.marketId), eq(specifications.active, true)))
          .where(and(eq(specificationVersions.id, line.specificationVersionId), eq(specificationVersions.marketId, input.marketId), eq(specificationVersions.productId, line.productId), eq(specificationVersions.status, 'APPROVED'), or(isNull(specifications.customerId), eq(specifications.customerId, quotation.customerId)))).limit(1)
        if (!revision) issues.push({ lineId: line.id, lineNo: line.lineNo, code: 'SPECIFICATION_REVISION_INVALID', message: 'The selected Specification Revision is not approved, active and in scope for this SKU' })
      }
    }
    return { ready: issues.length === 0, issues }
  }

}
