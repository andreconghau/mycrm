import 'server-only'
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  lt,
  or,
  sql,
  type SQL,
} from 'drizzle-orm'
import {
  AccessDeniedError,
  type Principal,
} from '@/modules/access-control/domain/types'
import { getDatabase } from '@/modules/access-control/infrastructure/database'
import {
  auditEvents,
  customers,
  fileAttachments,
  files,
  markets,
  productAliases,
  products,
  specificationVersions,
  specifications,
} from '@/modules/access-control/infrastructure/schema'
import {
  assertApprovable,
  canTransitionSpecificationRevision,
  isEditableRevisionStatus,
} from '../domain/specification-lifecycle'
import { assertPlausibleMeasurements } from '../domain/specification-measurements'
import {
  buildSpecificationSnapshot,
  type SpecificationSnapshot,
} from '../domain/specification-snapshot'

export class SpecificationNotFoundError extends Error {
  constructor() {
    super('Specification not found')
    this.name = 'SpecificationNotFoundError'
  }
}

export class SpecificationConflictError extends Error {
  constructor(message = 'Specification changed; reload and retry') {
    super(message)
    this.name = 'SpecificationConflictError'
  }
}

export class SpecificationImmutableError extends Error {
  constructor(
    message = 'An approved specification revision cannot be edited; create a new revision',
  ) {
    super(message)
    this.name = 'SpecificationImmutableError'
  }
}

export class ProductNotEligibleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProductNotEligibleError'
  }
}

export class SpecificationCustomerNotEligibleError extends Error {
  constructor() {
    super('The buyer is not available in this market')
    this.name = 'SpecificationCustomerNotEligibleError'
  }
}

export class CodeAllocationError extends Error {
  constructor() {
    super('A specification code could not be allocated; retry the request')
    this.name = 'CodeAllocationError'
  }
}

type Database = ReturnType<typeof getDatabase>
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]
type Executor = Database | Transaction

type RevisionRow = typeof specificationVersions.$inferSelect
type SpecificationRow = typeof specifications.$inferSelect

const MAX_CODE_ATTEMPTS = 5

function safeSearch(value: string) {
  return `%${value.replace(/[\\%_]/g, '\\$&')}%`
}

function postgresErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  if ('code' in error && typeof error.code === 'string') return error.code
  if ('cause' in error) return postgresErrorCode(error.cause)
  return undefined
}

/** `55000` is raised by the migration-0004 immutability trigger. */
function isImmutabilityViolation(error: unknown) {
  return postgresErrorCode(error) === '55000'
}

function isUniqueViolation(error: unknown) {
  return postgresErrorCode(error) === '23505'
}

/**
 * Columns a draft revision may carry. Mapping the patch through this list
 * keeps an unexpected key from ever reaching an UPDATE statement, independently
 * of the grant-level write-field check in the service.
 */
const revisionColumns = [
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

type RevisionColumn = (typeof revisionColumns)[number]

function revisionContent(patch: Record<string, unknown>) {
  const content: Record<string, unknown> = {}
  for (const column of revisionColumns) {
    if (patch[column] !== undefined) content[column] = patch[column]
  }
  return content
}

function measurementView(revision: Record<string, unknown>) {
  return {
    netWeightPerPack: revision.netWeightPerPack as string | null,
    grossWeightPerPack: revision.grossWeightPerPack as string | null,
    cartonNetWeight: revision.cartonNetWeight as string | null,
    weightUnit: revision.weightUnit as string | null,
    packsPerCarton: revision.packsPerCarton as number | null,
    glazingPercent: revision.glazingPercent as string | null,
    moq: revision.moq as string | null,
    moqUnit: revision.moqUnit as string | null,
    uom: revision.uom as string | null,
    shelfLifeMonths: revision.shelfLifeMonths as number | null,
    storageTempC: revision.storageTempC as string | null,
  }
}

export class SpecificationRepository {
  private readonly database = getDatabase()

  assertMarketAccess(actor: Principal, marketId: number) {
    if (!actor.marketIds.includes(marketId)) throw new AccessDeniedError()
  }

  async resolveMarketId(actor: Principal, marketCode: string) {
    const [market] = await this.database
      .select({ id: markets.id })
      .from(markets)
      .where(and(eq(markets.code, marketCode), eq(markets.active, true)))
      .limit(1)
    if (!market || !actor.marketIds.includes(market.id)) {
      throw new AccessDeniedError()
    }
    return market.id
  }

  // -------------------------------------------------------------------------
  // Reads
  // -------------------------------------------------------------------------

  async list(input: {
    actor: Principal
    marketId: number
    query?: string
    productId?: number
    customerId?: number
    status?: string
    kind?: 'STANDARD' | 'BUYER'
    active?: boolean
    limit: number
    cursor?: { createdAt: string; id: number }
  }) {
    this.assertMarketAccess(input.actor, input.marketId)
    const conditions: SQL[] = [eq(specifications.marketId, input.marketId)]
    if (input.productId) {
      conditions.push(eq(specifications.productId, input.productId))
    }
    if (input.customerId) {
      conditions.push(eq(specifications.customerId, input.customerId))
    }
    if (input.kind === 'STANDARD') {
      conditions.push(sql`${specifications.customerId} IS NULL`)
    }
    if (input.kind === 'BUYER') {
      conditions.push(sql`${specifications.customerId} IS NOT NULL`)
    }
    if (input.active !== undefined) {
      conditions.push(eq(specifications.active, input.active))
    }
    if (input.query) {
      const pattern = safeSearch(input.query)
      conditions.push(
        or(
          ilike(specifications.code, pattern),
          sql`EXISTS (
            SELECT 1 FROM ${products}
            WHERE ${products.id} = ${specifications.productId}
              AND (${ilike(products.sku, pattern)} OR ${ilike(products.displayName, pattern)})
          )`,
        )!,
      )
    }
    if (input.status) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${specificationVersions}
          WHERE ${specificationVersions.specificationId} = ${specifications.id}
            AND ${specificationVersions.marketId} = ${specifications.marketId}
            AND ${specificationVersions.status} = ${input.status}
        )`,
      )
    }
    if (input.cursor) {
      const createdAt = new Date(input.cursor.createdAt)
      conditions.push(
        or(
          lt(specifications.createdAt, createdAt),
          and(
            eq(specifications.createdAt, createdAt),
            lt(specifications.id, input.cursor.id),
          ),
        )!,
      )
    }

    const rows = await this.database
      .select()
      .from(specifications)
      .where(and(...conditions))
      .orderBy(desc(specifications.createdAt), desc(specifications.id))
      .limit(input.limit + 1)

    const hasMore = rows.length > input.limit
    const items = hasMore ? rows.slice(0, input.limit) : rows
    const last = items.at(-1)
    const [revisionsBySpecification, productsById] = await Promise.all([
      this.revisionsFor(
        input.marketId,
        items.map((item) => item.id),
      ),
      this.productsFor(items.map((item) => item.productId)),
    ])

    return {
      items: items.map((item) =>
        this.compose(
          item,
          revisionsBySpecification.get(item.id) ?? [],
          productsById.get(item.productId),
        ),
      ),
      nextCursor:
        hasMore && last
          ? Buffer.from(
              JSON.stringify({
                createdAt: last.createdAt.toISOString(),
                id: last.id,
              }),
            ).toString('base64url')
          : null,
    }
  }

  async get(actor: Principal, marketId: number, id: number) {
    this.assertMarketAccess(actor, marketId)
    const specification = await this.loadSpecification(
      this.database,
      marketId,
      id,
    )
    const revisions = await this.database
      .select()
      .from(specificationVersions)
      .where(
        and(
          eq(specificationVersions.marketId, marketId),
          eq(specificationVersions.specificationId, id),
        ),
      )
      .orderBy(desc(specificationVersions.revisionNo))
    const product = (await this.productsFor([specification.productId])).get(
      specification.productId,
    )
    return this.compose(specification, revisions, product)
  }

  async listRevisions(actor: Principal, marketId: number, id: number) {
    this.assertMarketAccess(actor, marketId)
    await this.loadSpecification(this.database, marketId, id)
    return this.database
      .select()
      .from(specificationVersions)
      .where(
        and(
          eq(specificationVersions.marketId, marketId),
          eq(specificationVersions.specificationId, id),
        ),
      )
      .orderBy(asc(specificationVersions.revisionNo))
  }

  async getRevision(
    actor: Principal,
    marketId: number,
    id: number,
    revisionNo: number,
  ) {
    this.assertMarketAccess(actor, marketId)
    await this.loadSpecification(this.database, marketId, id)
    const [revision] = await this.database
      .select()
      .from(specificationVersions)
      .where(
        and(
          eq(specificationVersions.marketId, marketId),
          eq(specificationVersions.specificationId, id),
          eq(specificationVersions.revisionNo, revisionNo),
        ),
      )
      .limit(1)
    if (!revision) throw new SpecificationNotFoundError()
    return revision
  }

  /**
   * Authorized metadata for the technical documents attached to a revision.
   *
   * No storage adapter exists in R1, so this is read-only and deliberately
   * omits `files.storage_key`: a private object key must never leave the
   * server, and no download URL is produced.
   */
  async listRevisionDocuments(
    actor: Principal,
    marketId: number,
    id: number,
    revisionNo: number,
  ) {
    const revision = await this.getRevision(actor, marketId, id, revisionNo)
    return this.database
      .select({
        fileId: files.id,
        purpose: fileAttachments.purpose,
        originalName: files.originalName,
        mediaType: files.mediaType,
        byteSize: files.byteSize,
        sha256: files.sha256,
        scanState: files.scanState,
        createdAt: fileAttachments.createdAt,
      })
      .from(fileAttachments)
      .innerJoin(
        files,
        and(
          eq(files.id, fileAttachments.fileId),
          eq(files.marketId, fileAttachments.marketId),
        ),
      )
      .where(
        and(
          eq(fileAttachments.marketId, marketId),
          eq(fileAttachments.specificationVersionId, revision.id),
        ),
      )
      .orderBy(asc(fileAttachments.id))
  }

  /**
   * The immutable offer snapshot M10 Quotations will persist into
   * `quotation_lines.specification_snapshot`. Only an approved revision may be
   * selected for a new offer; an archived revision stays snapshotable so a
   * historical offer can still be reproduced.
   */
  async buildOfferSnapshot(input: {
    actor: Principal
    marketId: number
    specificationId: number
    revisionNo: number
    requireApproved?: boolean
    capturedAt?: Date
  }): Promise<SpecificationSnapshot> {
    const specification = await this.loadSpecification(
      this.database,
      input.marketId,
      input.specificationId,
    )
    const revision = await this.getRevision(
      input.actor,
      input.marketId,
      input.specificationId,
      input.revisionNo,
    )
    if (input.requireApproved && revision.status !== 'APPROVED') {
      throw new ProductNotEligibleError(
        'Only an approved specification revision can be selected for a new offer',
      )
    }
    const product = (await this.productsFor([specification.productId])).get(
      specification.productId,
    )
    if (!product) throw new SpecificationNotFoundError()
    const documents = await this.listRevisionDocuments(
      input.actor,
      input.marketId,
      input.specificationId,
      input.revisionNo,
    )
    return buildSpecificationSnapshot({
      revision,
      specification,
      product: { id: product.id, sku: product.sku, names: product.names },
      documents,
      capturedAt: input.capturedAt ?? new Date(),
    })
  }

  // -------------------------------------------------------------------------
  // Writes
  // -------------------------------------------------------------------------

  /**
   * Creates a specification together with its first DRAFT revision. The code
   * is allocated inside the transaction; `UNIQUE (market_id, code)` is the
   * arbiter and a unique violation is retried a bounded number of times.
   */
  async create(input: {
    actor: Principal
    requestId: string
    marketId: number
    productId: number
    customerId?: number | null
    values: Record<string, unknown>
  }) {
    this.assertMarketAccess(input.actor, input.marketId)
    const content = revisionContent(input.values)
    assertPlausibleMeasurements(measurementView(content))

    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
      try {
        return await this.database.transaction(async (transaction) => {
          const product = await this.requireEligibleProduct(
            transaction,
            input.productId,
          )
          if (input.customerId != null) {
            await this.requireEligibleCustomer(
              transaction,
              input.marketId,
              input.customerId,
            )
          }
          const code = await this.allocateCode(
            transaction,
            input.marketId,
            input.productId,
            product.sku,
          )
          const [specification] = await transaction
            .insert(specifications)
            .values({
              marketId: input.marketId,
              productId: input.productId,
              customerId: input.customerId ?? null,
              code,
              active: true,
            })
            .returning()
          const [revision] = await transaction
            .insert(specificationVersions)
            .values({
              marketId: input.marketId,
              specificationId: specification.id,
              productId: input.productId,
              revisionNo: 1,
              status: 'DRAFT',
              createdBy: input.actor.userId,
              ...content,
            })
            .returning()
          await this.audit(transaction, {
            actor: input.actor,
            requestId: input.requestId,
            marketId: input.marketId,
            action: 'specification.created',
            resourceId: specification.id,
            resourceVersion: specification.version,
            safeDiff: {
              code: specification.code,
              productId: input.productId,
              buyerSpecific: input.customerId != null,
              revisionNo: revision.revisionNo,
            },
          })
          return this.compose(specification, [revision], product)
        })
      } catch (error) {
        if (isUniqueViolation(error) && attempt < MAX_CODE_ATTEMPTS - 1)
          continue
        if (isUniqueViolation(error)) throw new CodeAllocationError()
        throw error
      }
    }
    throw new CodeAllocationError()
  }

  /** Edits a DRAFT revision in place. APPROVED/ARCHIVED content is immutable. */
  async updateRevision(input: {
    actor: Principal
    requestId: string
    marketId: number
    specificationId: number
    revisionNo: number
    revisionVersion: number
    patch: Record<string, unknown>
  }) {
    this.assertMarketAccess(input.actor, input.marketId)
    return this.database.transaction(async (transaction) => {
      const specification = await this.loadSpecification(
        transaction,
        input.marketId,
        input.specificationId,
      )
      const current = await this.lockRevision(
        transaction,
        input.marketId,
        input.specificationId,
        input.revisionNo,
      )
      if (!isEditableRevisionStatus(current.status)) {
        throw new SpecificationImmutableError()
      }
      if (current.version !== input.revisionVersion) {
        throw new SpecificationConflictError()
      }
      const content = revisionContent(input.patch)
      assertPlausibleMeasurements(measurementView({ ...current, ...content }))

      const [updated] = await transaction
        .update(specificationVersions)
        .set({
          ...content,
          updatedAt: new Date(),
          version: sql`${specificationVersions.version} + 1`,
        })
        .where(
          and(
            eq(specificationVersions.id, current.id),
            eq(specificationVersions.version, input.revisionVersion),
          ),
        )
        .returning()
      if (!updated) throw new SpecificationConflictError()

      await this.audit(transaction, {
        actor: input.actor,
        requestId: input.requestId,
        marketId: input.marketId,
        action: 'specification.revision_updated',
        resourceId: specification.id,
        resourceVersion: updated.version,
        safeDiff: {
          code: specification.code,
          revisionNo: updated.revisionNo,
          changedFields: Object.keys(content),
        },
      })
      return updated
    })
  }

  /**
   * Creates the next DRAFT revision, cloning a source revision's content so
   * the previous revision is left byte-for-byte unchanged (AC-05).
   */
  async createRevision(input: {
    actor: Principal
    requestId: string
    marketId: number
    specificationId: number
    specificationVersion: number
    sourceRevisionNo?: number
    patch: Record<string, unknown>
  }) {
    this.assertMarketAccess(input.actor, input.marketId)
    return this.database.transaction(async (transaction) => {
      const specification = await this.lockSpecification(
        transaction,
        input.marketId,
        input.specificationId,
      )
      if (specification.version !== input.specificationVersion) {
        throw new SpecificationConflictError()
      }
      if (!specification.active) {
        throw new SpecificationImmutableError(
          'An archived specification cannot receive new revisions',
        )
      }

      const existing = await transaction
        .select()
        .from(specificationVersions)
        .where(
          and(
            eq(specificationVersions.marketId, input.marketId),
            eq(specificationVersions.specificationId, input.specificationId),
          ),
        )
        .orderBy(desc(specificationVersions.revisionNo))
        .for('update')
      if (!existing.length) throw new SpecificationNotFoundError()

      const source = input.sourceRevisionNo
        ? existing.find((row) => row.revisionNo === input.sourceRevisionNo)
        : existing[0]
      if (!source) throw new SpecificationNotFoundError()
      if (existing.some((row) => row.status === 'DRAFT')) {
        throw new SpecificationConflictError(
          'An open draft revision already exists; edit or archive it first',
        )
      }

      const inherited = revisionContent(
        source as unknown as Record<string, unknown>,
      )
      const content = { ...inherited, ...revisionContent(input.patch) }
      assertPlausibleMeasurements(measurementView(content))

      const nextRevisionNo = existing[0].revisionNo + 1
      const [revision] = await transaction
        .insert(specificationVersions)
        .values({
          marketId: input.marketId,
          specificationId: input.specificationId,
          productId: specification.productId,
          revisionNo: nextRevisionNo,
          status: 'DRAFT',
          createdBy: input.actor.userId,
          ...content,
        })
        .returning()

      await transaction
        .update(specifications)
        .set({
          updatedAt: new Date(),
          version: sql`${specifications.version} + 1`,
        })
        .where(eq(specifications.id, specification.id))

      await this.audit(transaction, {
        actor: input.actor,
        requestId: input.requestId,
        marketId: input.marketId,
        action: 'specification.revision_created',
        resourceId: specification.id,
        resourceVersion: specification.version + 1,
        safeDiff: {
          code: specification.code,
          revisionNo: nextRevisionNo,
          clonedFrom: source.revisionNo,
        },
      })
      return revision
    })
  }

  /**
   * Approves (publishes) a DRAFT revision and archives the revision that was
   * previously approved, in one transaction. The partial unique index
   * `specification_versions_one_approved` is the final arbiter if two requests
   * race, so exactly one can win (AC-16).
   */
  async publishRevision(input: {
    actor: Principal
    requestId: string
    marketId: number
    specificationId: number
    revisionNo: number
    revisionVersion: number
    reason?: string
  }) {
    this.assertMarketAccess(input.actor, input.marketId)
    return this.database.transaction(async (transaction) => {
      const specification = await this.lockSpecification(
        transaction,
        input.marketId,
        input.specificationId,
      )
      if (!specification.active) {
        throw new SpecificationImmutableError(
          'An archived specification cannot approve new revisions',
        )
      }
      const current = await this.lockRevision(
        transaction,
        input.marketId,
        input.specificationId,
        input.revisionNo,
      )
      if (current.version !== input.revisionVersion) {
        throw new SpecificationConflictError()
      }
      if (!canTransitionSpecificationRevision(current.status, 'APPROVED')) {
        throw new SpecificationImmutableError(
          `A ${current.status} revision cannot be approved`,
        )
      }

      assertPlausibleMeasurements(measurementView(current))
      assertApprovable(current as unknown as Record<string, unknown>)

      const now = new Date()
      const [superseded] = await transaction
        .update(specificationVersions)
        .set({
          status: 'ARCHIVED',
          archivedAt: now,
          updatedAt: now,
          version: sql`${specificationVersions.version} + 1`,
        })
        .where(
          and(
            eq(specificationVersions.marketId, input.marketId),
            eq(specificationVersions.specificationId, input.specificationId),
            eq(specificationVersions.status, 'APPROVED'),
          ),
        )
        .returning({ revisionNo: specificationVersions.revisionNo })

      const [approved] = await transaction
        .update(specificationVersions)
        .set({
          status: 'APPROVED',
          publishedAt: now,
          approvedBy: input.actor.userId,
          updatedAt: now,
          version: sql`${specificationVersions.version} + 1`,
        })
        .where(
          and(
            eq(specificationVersions.id, current.id),
            eq(specificationVersions.version, input.revisionVersion),
          ),
        )
        .returning()
      if (!approved) throw new SpecificationConflictError()

      await transaction
        .update(specifications)
        .set({ updatedAt: now, version: sql`${specifications.version} + 1` })
        .where(eq(specifications.id, specification.id))

      await this.audit(transaction, {
        actor: input.actor,
        requestId: input.requestId,
        marketId: input.marketId,
        action: 'specification.revision_approved',
        resourceId: specification.id,
        resourceVersion: approved.version,
        reason: input.reason,
        safeDiff: {
          code: specification.code,
          revisionNo: approved.revisionNo,
          supersededRevisionNo: superseded?.revisionNo ?? null,
        },
      })
      return approved
    })
  }

  /**
   * Archives the whole specification. Historical references are preserved: no
   * row is deleted and every approved revision keeps its content (AC-11).
   */
  async archive(input: {
    actor: Principal
    requestId: string
    marketId: number
    specificationId: number
    specificationVersion: number
    reason?: string
  }) {
    this.assertMarketAccess(input.actor, input.marketId)
    return this.database.transaction(async (transaction) => {
      const specification = await this.lockSpecification(
        transaction,
        input.marketId,
        input.specificationId,
      )
      if (specification.version !== input.specificationVersion) {
        throw new SpecificationConflictError()
      }
      if (!specification.active) {
        throw new SpecificationConflictError(
          'This specification is already archived',
        )
      }
      const now = new Date()
      const [updated] = await transaction
        .update(specifications)
        .set({
          active: false,
          updatedAt: now,
          version: sql`${specifications.version} + 1`,
        })
        .where(
          and(
            eq(specifications.id, specification.id),
            eq(specifications.version, input.specificationVersion),
          ),
        )
        .returning()
      if (!updated) throw new SpecificationConflictError()

      const archivedRevisions = await transaction
        .update(specificationVersions)
        .set({
          status: 'ARCHIVED',
          archivedAt: now,
          updatedAt: now,
          version: sql`${specificationVersions.version} + 1`,
        })
        .where(
          and(
            eq(specificationVersions.marketId, input.marketId),
            eq(specificationVersions.specificationId, specification.id),
            inArray(specificationVersions.status, ['DRAFT', 'APPROVED']),
          ),
        )
        .returning({ revisionNo: specificationVersions.revisionNo })

      await this.audit(transaction, {
        actor: input.actor,
        requestId: input.requestId,
        marketId: input.marketId,
        action: 'specification.archived',
        resourceId: updated.id,
        resourceVersion: updated.version,
        reason: input.reason,
        safeDiff: {
          code: updated.code,
          archivedRevisionCount: archivedRevisions.length,
        },
      })
      return updated
    })
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  /**
   * `<SKU>-S<nn>` allocated from the highest existing suffix for this product
   * in this market, so codes stay stable and human-readable.
   */
  private async allocateCode(
    transaction: Transaction,
    marketId: number,
    productId: number,
    sku: string,
  ) {
    const existing = await transaction
      .select({ code: specifications.code })
      .from(specifications)
      .where(
        and(
          eq(specifications.marketId, marketId),
          eq(specifications.productId, productId),
        ),
      )
    const prefix = `${sku}-S`
    const highest = existing.reduce((maximum, row) => {
      if (!row.code.startsWith(prefix)) return maximum
      const suffix = Number.parseInt(row.code.slice(prefix.length), 10)
      return Number.isSafeInteger(suffix) && suffix > maximum ? suffix : maximum
    }, 0)
    const next = highest + 1
    if (next > 99) return `${prefix}${next}`
    return `${prefix}${String(next).padStart(2, '0')}`
  }

  private async requireEligibleProduct(executor: Executor, productId: number) {
    const [product] = await executor
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1)
    if (!product) {
      throw new ProductNotEligibleError('The referenced product does not exist')
    }
    if (product.status !== 'ACTIVE') {
      throw new ProductNotEligibleError(
        `Product ${product.sku} is ${product.status} and is not eligible for a new specification`,
      )
    }
    const aliases = await executor
      .select()
      .from(productAliases)
      .where(eq(productAliases.productId, product.id))
    return {
      ...product,
      names: Object.fromEntries(
        aliases
          .filter((alias) => alias.kind === 'NAME')
          .map((alias) => [alias.locale, alias.label]),
      ),
    }
  }

  private async requireEligibleCustomer(
    executor: Executor,
    marketId: number,
    customerId: number,
  ) {
    const [customer] = await executor
      .select({ id: customers.id, status: customers.status })
      .from(customers)
      .where(
        and(eq(customers.id, customerId), eq(customers.marketId, marketId)),
      )
      .limit(1)
    if (!customer || customer.status === 'ARCHIVED') {
      throw new SpecificationCustomerNotEligibleError()
    }
  }

  private async loadSpecification(
    executor: Executor,
    marketId: number,
    id: number,
  ) {
    const [specification] = await executor
      .select()
      .from(specifications)
      .where(
        and(eq(specifications.id, id), eq(specifications.marketId, marketId)),
      )
      .limit(1)
    if (!specification) throw new SpecificationNotFoundError()
    return specification
  }

  private async lockSpecification(
    transaction: Transaction,
    marketId: number,
    id: number,
  ) {
    const [specification] = await transaction
      .select()
      .from(specifications)
      .where(
        and(eq(specifications.id, id), eq(specifications.marketId, marketId)),
      )
      .for('update')
      .limit(1)
    if (!specification) throw new SpecificationNotFoundError()
    return specification
  }

  private async lockRevision(
    transaction: Transaction,
    marketId: number,
    specificationId: number,
    revisionNo: number,
  ) {
    const [revision] = await transaction
      .select()
      .from(specificationVersions)
      .where(
        and(
          eq(specificationVersions.marketId, marketId),
          eq(specificationVersions.specificationId, specificationId),
          eq(specificationVersions.revisionNo, revisionNo),
        ),
      )
      .for('update')
      .limit(1)
    if (!revision) throw new SpecificationNotFoundError()
    return revision
  }

  /**
   * Mandatory audit. It runs inside the caller's transaction so a failing
   * audit insert rolls the business change back (AC-19).
   */
  private async audit(
    transaction: Transaction,
    input: {
      actor: Principal
      requestId: string
      marketId: number
      action: string
      resourceId: number
      resourceVersion: number
      reason?: string
      safeDiff: Record<string, unknown>
    },
  ) {
    await transaction.insert(auditEvents).values({
      marketId: input.marketId,
      actorId: input.actor.userId,
      action: input.action,
      resourceType: 'specification',
      resourceId: input.resourceId,
      resourceVersion: input.resourceVersion,
      requestId: input.requestId,
      reason: input.reason,
      safeDiff: input.safeDiff,
      result: 'SUCCESS',
    })
  }

  private async revisionsFor(marketId: number, specificationIds: number[]) {
    const map = new Map<number, RevisionRow[]>()
    if (!specificationIds.length) return map
    const rows = await this.database
      .select()
      .from(specificationVersions)
      .where(
        and(
          eq(specificationVersions.marketId, marketId),
          inArray(specificationVersions.specificationId, specificationIds),
        ),
      )
      .orderBy(desc(specificationVersions.revisionNo))
    for (const row of rows) {
      const list = map.get(row.specificationId) ?? []
      list.push(row)
      map.set(row.specificationId, list)
    }
    return map
  }

  private async productsFor(productIds: number[]) {
    const map = new Map<
      number,
      typeof products.$inferSelect & { names: Record<string, string> }
    >()
    const unique = [...new Set(productIds)]
    if (!unique.length) return map
    const rows = await this.database
      .select()
      .from(products)
      .where(inArray(products.id, unique))
    const aliases = await this.database
      .select()
      .from(productAliases)
      .where(inArray(productAliases.productId, unique))
    for (const row of rows) {
      map.set(row.id, {
        ...row,
        names: Object.fromEntries(
          aliases
            .filter(
              (alias) => alias.productId === row.id && alias.kind === 'NAME',
            )
            .map((alias) => [alias.locale, alias.label]),
        ),
      })
    }
    return map
  }

  private compose(
    specification: SpecificationRow,
    revisions: RevisionRow[],
    product?: typeof products.$inferSelect & { names?: Record<string, string> },
  ) {
    const approved = revisions.find((row) => row.status === 'APPROVED')
    const draft = revisions.find((row) => row.status === 'DRAFT')
    return {
      ...specification,
      productSku: product?.sku ?? null,
      productName: product?.displayName ?? null,
      productNames: product?.names ?? {},
      currentRevision: approved ?? draft ?? revisions[0] ?? null,
      approvedRevision: approved ?? null,
      draftRevision: draft ?? null,
      revisions,
    }
  }
}

export { isImmutabilityViolation }
