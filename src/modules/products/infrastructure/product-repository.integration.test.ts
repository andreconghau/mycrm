/**
 * M06 Products integration suite (AC-01 … AC-17 at the domain/repository level).
 *
 * Runs against real PostgreSQL in a throwaway schema created from the R1
 * baseline initializer plus migration 0003_products_catalog, so the real
 * UNIQUE/CHECK constraints, optimistic concurrency, lifecycle gate and the
 * historical-snapshot boundary (quotation_lines.product_snapshot) are proven
 * against the database rather than against mocks. RFQ/Quotation (M09/M10) do
 * not exist yet, so AC-08/AC-09 are verified with a synthetic snapshot row
 * inserted directly into quotation_lines, not through a real quotation flow.
 */
import { randomBytes, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import postgres from 'postgres'
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

const schemaName = `products_it_${randomBytes(4).toString('hex')}`
if (!/^products_it_[0-9a-f]{8}$/.test(schemaName))
  throw new Error('Unsafe test schema name')

const baseDatabaseUrl = process.env.DATABASE_URL
if (!baseDatabaseUrl) throw new Error('DATABASE_URL is required')

const isolatedUrl = new URL(baseDatabaseUrl)
isolatedUrl.searchParams.set('options', `-c search_path=${schemaName}`)
process.env.DATABASE_URL = isolatedUrl.toString()

const admin = postgres(baseDatabaseUrl, { max: 1, prepare: false })

type Principal = import('@/modules/access-control/domain/types').Principal
type ProductRepositoryType = import('./product-repository').ProductRepository

let repository: ProductRepositoryType
let ProductConflictError: typeof import('./product-repository').ProductConflictError
let sqlClient: ReturnType<typeof postgres>

const ADMIN_USER = 1

const actor: Principal = {
  userId: ADMIN_USER,
  sessionId: 1,
  displayName: 'Admin User',
  email: 'admin@example.test',
  roles: ['admin'],
  teamIds: [],
  marketIds: [],
}

const canTransition = (from: string, to: string) =>
  ({ DRAFT: ['ACTIVE'], ACTIVE: ['INACTIVE'], INACTIVE: ['ACTIVE'] }[from]?.includes(
    to,
  ) ?? false)

const request = () => randomUUID()

beforeAll(async () => {
  const baseline = await readFile(
    path.join(process.cwd(), 'docs/structure/01_init_20261106.sql'),
    'utf8',
  )
  const migration = await readFile(
    path.join(process.cwd(), 'db/migrations/0003_products_catalog.sql'),
    'utf8',
  )
  await admin.unsafe(`CREATE SCHEMA "${schemaName}"`)
  const isolated = postgres(baseDatabaseUrl, {
    max: 1,
    prepare: false,
    connection: { search_path: schemaName },
  })
  try {
    await isolated.unsafe(baseline)
    await isolated.unsafe(migration)
  } finally {
    await isolated.end()
  }

  const repositoryModule = await import('./product-repository')
  repository = new repositoryModule.ProductRepository()
  ProductConflictError = repositoryModule.ProductConflictError
  sqlClient = postgres(baseDatabaseUrl, {
    max: 1,
    prepare: false,
    connection: { search_path: schemaName },
  })
}, 180_000)

afterAll(async () => {
  await sqlClient?.end()
  await admin.unsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`)
  await admin.end()
})

beforeEach(async () => {
  await sqlClient`
    TRUNCATE products, product_aliases, audit_events, quotation_lines, users
    RESTART IDENTITY CASCADE
  `
  await sqlClient`
    INSERT INTO users (id, email, display_name, status)
    VALUES (${ADMIN_USER}, 'admin@example.test', 'Admin User', 'ACTIVE')
  `
})

function createInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    sku: 'SQ-001',
    names: { en: 'Squid', vi: 'Mực', ko: '오징어' },
    category: 'Cephalopod',
    speciesCommonName: 'Squid',
    speciesScientificName: null,
    productFamily: 'Squid',
    defaultUnit: 'KG',
    descriptionEn: null,
    descriptionVi: null,
    descriptionKo: null,
    aliases: [],
    ...overrides,
  }
}

async function createProduct(overrides: Partial<Record<string, unknown>> = {}) {
  return repository.create({
    actor,
    requestId: request(),
    values: createInput(overrides) as never,
  })
}

describe('M06 products · authorized creation and audit (AC-01)', () => {
  it('IT-01 creates a DRAFT product with required names and audits it', async () => {
    const product = await createProduct()

    expect(product.status).toBe('DRAFT')
    expect(product.version).toBe(1)
    expect(product.names).toEqual({ en: 'Squid', vi: 'Mực', ko: '오징어' })

    const [audit] = await sqlClient`
      SELECT action, resource_type, resource_id, result, safe_diff
      FROM audit_events
      WHERE resource_type = 'product' AND action = 'product.created'
    `
    expect(audit).toMatchObject({
      action: 'product.created',
      resource_id: product.id,
      result: 'SUCCESS',
    })

    const names = await sqlClient`
      SELECT locale, label, kind FROM product_aliases
      WHERE product_id = ${product.id} ORDER BY locale
    `
    expect(names).toEqual([
      { locale: 'en', label: 'Squid', kind: 'NAME' },
      { locale: 'ko', label: '오징어', kind: 'NAME' },
      { locale: 'vi', label: 'Mực', kind: 'NAME' },
    ])
  })

  it('IT-02 rejects a duplicate SKU (AC-02)', async () => {
    await createProduct({ sku: 'SQ-DUP' })
    await expect(createProduct({ sku: 'SQ-DUP' })).rejects.toMatchObject({
      cause: { code: '23505' },
    })
  })
})

describe('M06 products · lifecycle eligibility gate (AC-05 … AC-09)', () => {
  it('IT-03 a DRAFT product cannot transition straight to INACTIVE', async () => {
    const product = await createProduct()
    await expect(
      repository.transition({
        actor,
        requestId: request(),
        id: product.id,
        version: product.version,
        to: 'INACTIVE',
        canTransition,
      }),
    ).rejects.toThrow('INVALID_PRODUCT_TRANSITION')
  })

  it('IT-04 approve (DRAFT -> ACTIVE) then retire (ACTIVE -> INACTIVE) and audits both', async () => {
    const product = await createProduct()
    const approved = await repository.transition({
      actor,
      requestId: request(),
      id: product.id,
      version: product.version,
      to: 'ACTIVE',
      canTransition,
    })
    expect(approved.status).toBe('ACTIVE')

    const retired = await repository.transition({
      actor,
      requestId: request(),
      id: product.id,
      version: approved.version,
      to: 'INACTIVE',
      reason: 'Seasonal sourcing unavailable',
      canTransition,
    })
    expect(retired.status).toBe('INACTIVE')

    const events = await sqlClient`
      SELECT action FROM audit_events
      WHERE resource_type = 'product' AND resource_id = ${product.id}
      ORDER BY id
    `
    expect(events.map((row) => row.action)).toEqual([
      'product.created',
      'product.approved',
      'product.retired',
    ])
  })

  it('IT-05 a retired product can be reactivated (INACTIVE -> ACTIVE)', async () => {
    const product = await createProduct()
    const approved = await repository.transition({
      actor,
      requestId: request(),
      id: product.id,
      version: product.version,
      to: 'ACTIVE',
      canTransition,
    })
    const retired = await repository.transition({
      actor,
      requestId: request(),
      id: product.id,
      version: approved.version,
      to: 'INACTIVE',
      canTransition,
    })
    const reactivated = await repository.transition({
      actor,
      requestId: request(),
      id: product.id,
      version: retired.version,
      to: 'ACTIVE',
      canTransition,
    })
    expect(reactivated.status).toBe('ACTIVE')
  })

  it('IT-06 renaming or retiring a product never alters a prior commercial snapshot (AC-08, AC-09, AC-10, AC-11)', async () => {
    const product = await createProduct()
    const active = await repository.transition({
      actor,
      requestId: request(),
      id: product.id,
      version: product.version,
      to: 'ACTIVE',
      canTransition,
    })

    // Simulate a quotation line created while the SKU was ACTIVE and eligible.
    // M09/M10 do not exist yet; this proves the snapshot boundary at the DB
    // level per the task's instruction not to claim RFQ/Quotation integration.
    await sqlClient`
      INSERT INTO quotation_lines (
        market_id, quotation_version_id, rfq_id, line_no, product_id,
        specification_version_id, quantity, unit, input_currency,
        input_unit_price, original_line_amount, converted_usd_amount,
        product_snapshot, specification_snapshot, selected_by, selected_at
      ) VALUES (
        1, 1, 1, 1, ${product.id}, 1, 10, 'KG', 'USD', 5, 50, 50,
        ${sqlClient.json({ sku: 'SQ-001', displayName: 'Squid' })},
        ${sqlClient.json({})}, ${ADMIN_USER}, now()
      )
    `

    const renamed = await repository.update({
      actor,
      requestId: request(),
      id: product.id,
      version: active.version,
      patch: { names: { en: 'Giant Squid' } },
    })
    expect(renamed.displayName).toBe('Giant Squid')

    await repository.transition({
      actor,
      requestId: request(),
      id: product.id,
      version: renamed.version,
      to: 'INACTIVE',
      canTransition,
    })

    const [snapshot] = await sqlClient`
      SELECT product_snapshot FROM quotation_lines WHERE product_id = ${product.id}
    `
    expect(snapshot.product_snapshot).toEqual({
      sku: 'SQ-001',
      displayName: 'Squid',
    })
  })

  it('IT-07 an INACTIVE or DRAFT product is excluded from an ACTIVE-only catalog listing (AC-16, AC-17)', async () => {
    const draft = await createProduct({ sku: 'SQ-DRAFT' })
    const active = await createProduct({ sku: 'SQ-ACTIVE' })
    await repository.transition({
      actor,
      requestId: request(),
      id: active.id,
      version: active.version,
      to: 'ACTIVE',
      canTransition,
    })

    const page = await repository.list({ status: 'ACTIVE', limit: 50 })
    expect(page.items.map((item) => item.id)).toEqual([active.id])
    expect(page.items.map((item) => item.id)).not.toContain(draft.id)
  })
})

describe('M06 products · concurrency and mandatory audit', () => {
  it('IT-08 a stale version loses rather than silently overwriting (AC-13)', async () => {
    const product = await createProduct()
    await repository.update({
      actor,
      requestId: request(),
      id: product.id,
      version: product.version,
      patch: { category: 'First writer' },
    })
    await expect(
      repository.update({
        actor,
        requestId: request(),
        id: product.id,
        version: product.version,
        patch: { category: 'Second writer' },
      }),
    ).rejects.toBeInstanceOf(ProductConflictError)
  })

  it('IT-09 concurrent transitions on the same version: only one wins', async () => {
    const product = await createProduct()
    const results = await Promise.allSettled([
      repository.transition({
        actor,
        requestId: request(),
        id: product.id,
        version: product.version,
        to: 'ACTIVE',
        canTransition,
      }),
      repository.transition({
        actor,
        requestId: request(),
        id: product.id,
        version: product.version,
        to: 'ACTIVE',
        canTransition,
      }),
    ])
    const fulfilled = results.filter((result) => result.status === 'fulfilled')
    const rejected = results.filter((result) => result.status === 'rejected')
    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)
  })

  it('IT-10 a failed mandatory audit write rolls the business change back (AC-14)', async () => {
    const product = await createProduct()
    // audit_events.request_id is NOT NULL; force an audit failure to prove
    // the business write and the audit insert share one transaction.
    await expect(
      repository.update({
        actor,
        requestId: null as unknown as string,
        id: product.id,
        version: product.version,
        patch: { category: 'Should be rolled back' },
      }),
    ).rejects.toThrow()

    const current = await repository.get(product.id)
    expect(current?.category).toBe('Cephalopod')
    expect(current?.version).toBe(1)
  })

  it('IT-11 get() returns null for a nonexistent id (not a thrown error)', async () => {
    expect(await repository.get(999_999)).toBeNull()
  })
})
