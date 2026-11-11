import 'server-only'
import { and, desc, eq, ilike, inArray, lt, or, sql, type SQL } from 'drizzle-orm'
import type { Principal } from '@/modules/access-control/domain/types'
import { getDatabase } from '@/modules/access-control/infrastructure/database'
import {
  auditEvents,
  productAliases,
  products,
} from '@/modules/access-control/infrastructure/schema'

export class ProductConflictError extends Error {
  constructor(message = 'Product changed; reload and retry') {
    super(message)
    this.name = 'ProductConflictError'
  }
}

export class ProductNotFoundError extends Error {
  constructor() {
    super('Product not found')
    this.name = 'ProductNotFoundError'
  }
}

function safeSearch(value: string) {
  return `%${value.replace(/[\\%_]/g, '\\$&')}%`
}

type AliasRow = { locale: string; label: string; kind: string }

function namesFromAliases(aliases: AliasRow[]) {
  const names: Record<string, string> = {}
  for (const alias of aliases) {
    if (alias.kind === 'NAME') names[alias.locale] = alias.label
  }
  return names
}

function searchAliasesFromAliases(aliases: AliasRow[]) {
  return aliases
    .filter((alias) => alias.kind === 'ALIAS')
    .map(({ locale, label }) => ({ locale, label }))
}

export class ProductRepository {
  private readonly database = getDatabase()

  async list(input: {
    query?: string
    category?: string
    status?: string
    limit: number
    cursor?: { createdAt: string; id: number }
  }) {
    const conditions: SQL[] = []
    if (input.query) {
      const pattern = safeSearch(input.query)
      conditions.push(
        or(
          ilike(products.displayName, pattern),
          ilike(products.sku, pattern),
          ilike(products.category, pattern),
        )!,
      )
    }
    if (input.category) conditions.push(eq(products.category, input.category))
    if (input.status) conditions.push(eq(products.status, input.status))
    if (input.cursor) {
      const createdAt = new Date(input.cursor.createdAt)
      conditions.push(
        or(
          lt(products.createdAt, createdAt),
          and(eq(products.createdAt, createdAt), lt(products.id, input.cursor.id)),
        )!,
      )
    }
    const rows = await this.database
      .select()
      .from(products)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(products.createdAt), desc(products.id))
      .limit(input.limit + 1)
    const hasMore = rows.length > input.limit
    const items = hasMore ? rows.slice(0, input.limit) : rows
    const last = items.at(-1)
    const aliasesByProduct = await this.aliasesFor(items.map((item) => item.id))
    return {
      items: items.map((item) => this.withAliases(item, aliasesByProduct.get(item.id) ?? [])),
      nextCursor:
        hasMore && last
          ? Buffer.from(
              JSON.stringify({ createdAt: last.createdAt.toISOString(), id: last.id }),
            ).toString('base64url')
          : null,
    }
  }

  async get(id: number) {
    const [product] = await this.database
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1)
    if (!product) return null
    const aliases = await this.database
      .select()
      .from(productAliases)
      .where(eq(productAliases.productId, id))
    return this.withAliases(product, aliases)
  }

  async create(input: {
    actor: Principal
    requestId: string
    values: {
      sku: string
      names: { en: string; vi: string; ko: string }
      category?: string | null
      speciesCommonName?: string | null
      speciesScientificName?: string | null
      productFamily?: string | null
      defaultUnit: string
      descriptionEn?: string | null
      descriptionVi?: string | null
      descriptionKo?: string | null
      aliases: Array<{ locale: string; label: string }>
    }
  }) {
    return this.database.transaction(async (transaction) => {
      const [product] = await transaction
        .insert(products)
        .values({
          sku: input.values.sku,
          displayName: input.values.names.en,
          category: input.values.category ?? null,
          speciesCommonName: input.values.speciesCommonName ?? null,
          speciesScientificName: input.values.speciesScientificName ?? null,
          productFamily: input.values.productFamily ?? null,
          defaultUnit: input.values.defaultUnit,
          status: 'DRAFT',
          descriptionEn: input.values.descriptionEn ?? null,
          descriptionVi: input.values.descriptionVi ?? null,
          descriptionKo: input.values.descriptionKo ?? null,
        })
        .returning()
      await this.insertNames(transaction, product.id, input.values.names)
      for (const alias of input.values.aliases) {
        await transaction.insert(productAliases).values({
          productId: product.id,
          locale: alias.locale,
          label: alias.label,
          kind: 'ALIAS',
        })
      }
      await transaction.insert(auditEvents).values({
        marketId: null,
        actorId: input.actor.userId,
        action: 'product.created',
        resourceType: 'product',
        resourceId: product.id,
        resourceVersion: product.version,
        requestId: input.requestId,
        safeDiff: { sku: product.sku, status: product.status },
        result: 'SUCCESS',
      })
      const aliases = await transaction
        .select()
        .from(productAliases)
        .where(eq(productAliases.productId, product.id))
      return this.withAliases(product, aliases)
    })
  }

  async update(input: {
    actor: Principal
    requestId: string
    id: number
    version: number
    patch: Record<string, unknown>
  }) {
    return this.database.transaction(async (transaction) => {
      const [current] = await transaction
        .select()
        .from(products)
        .where(eq(products.id, input.id))
        .for('update')
        .limit(1)
      if (!current) throw new ProductNotFoundError()
      if (current.version !== input.version) throw new ProductConflictError()
      const { names, aliases, ...fields } = input.patch as {
        names?: Partial<{ en: string; vi: string; ko: string }>
        aliases?: Array<{ locale: string; label: string }>
      } & Record<string, unknown>
      const columnPatch: Record<string, unknown> = { ...fields }
      if (names?.en) columnPatch.displayName = names.en
      const [updated] = await transaction
        .update(products)
        .set({
          ...columnPatch,
          updatedAt: new Date(),
          version: sql`${products.version} + 1`,
        })
        .where(and(eq(products.id, input.id), eq(products.version, input.version)))
        .returning()
      if (!updated) throw new ProductConflictError()
      if (names) {
        for (const [locale, label] of Object.entries(names)) {
          if (!label) continue
          await transaction
            .insert(productAliases)
            .values({ productId: updated.id, locale, label, kind: 'NAME' })
            .onConflictDoUpdate({
              target: [productAliases.productId, productAliases.locale],
              targetWhere: sql`${productAliases.kind} = 'NAME'`,
              set: { label },
            })
        }
      }
      if (aliases) {
        await transaction
          .delete(productAliases)
          .where(and(eq(productAliases.productId, updated.id), eq(productAliases.kind, 'ALIAS')))
        for (const alias of aliases) {
          await transaction.insert(productAliases).values({
            productId: updated.id,
            locale: alias.locale,
            label: alias.label,
            kind: 'ALIAS',
          })
        }
      }
      await transaction.insert(auditEvents).values({
        marketId: null,
        actorId: input.actor.userId,
        action: 'product.updated',
        resourceType: 'product',
        resourceId: updated.id,
        resourceVersion: updated.version,
        requestId: input.requestId,
        safeDiff: { changedFields: Object.keys(input.patch) },
        result: 'SUCCESS',
      })
      const aliasRows = await transaction
        .select()
        .from(productAliases)
        .where(eq(productAliases.productId, updated.id))
      return this.withAliases(updated, aliasRows)
    })
  }

  async transition(input: {
    actor: Principal
    requestId: string
    id: number
    version: number
    to: string
    reason?: string
    canTransition: (from: string, to: string) => boolean
  }) {
    return this.database.transaction(async (transaction) => {
      const [current] = await transaction
        .select()
        .from(products)
        .where(eq(products.id, input.id))
        .for('update')
        .limit(1)
      if (!current) throw new ProductNotFoundError()
      if (current.version !== input.version) throw new ProductConflictError()
      if (!input.canTransition(current.status, input.to)) {
        throw new Error('INVALID_PRODUCT_TRANSITION')
      }
      const [updated] = await transaction
        .update(products)
        .set({
          status: input.to,
          updatedAt: new Date(),
          version: sql`${products.version} + 1`,
        })
        .where(and(eq(products.id, input.id), eq(products.version, input.version)))
        .returning()
      if (!updated) throw new ProductConflictError()
      await transaction.insert(auditEvents).values({
        marketId: null,
        actorId: input.actor.userId,
        action:
          input.to === 'ACTIVE'
            ? current.status === 'DRAFT'
              ? 'product.approved'
              : 'product.reactivated'
            : 'product.retired',
        resourceType: 'product',
        resourceId: updated.id,
        resourceVersion: updated.version,
        requestId: input.requestId,
        reason: input.reason,
        safeDiff: { fromStatus: current.status, toStatus: updated.status },
        result: 'SUCCESS',
      })
      const aliasRows = await transaction
        .select()
        .from(productAliases)
        .where(eq(productAliases.productId, updated.id))
      return this.withAliases(updated, aliasRows)
    })
  }

  private async insertNames(
    transaction: Parameters<Parameters<typeof this.database.transaction>[0]>[0],
    productId: number,
    names: { en: string; vi: string; ko: string },
  ) {
    for (const [locale, label] of Object.entries(names)) {
      await transaction.insert(productAliases).values({
        productId,
        locale,
        label,
        kind: 'NAME',
      })
    }
  }

  private async aliasesFor(productIds: number[]) {
    const map = new Map<number, AliasRow[]>()
    if (!productIds.length) return map
    const rows = await this.database
      .select()
      .from(productAliases)
      .where(inArray(productAliases.productId, productIds))
    for (const row of rows) {
      const list = map.get(row.productId) ?? []
      list.push(row)
      map.set(row.productId, list)
    }
    return map
  }

  private withAliases(product: typeof products.$inferSelect, aliases: AliasRow[]) {
    return {
      ...product,
      names: namesFromAliases(aliases),
      aliases: searchAliasesFromAliases(aliases),
    }
  }
}
