import { randomBytes, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import postgres from 'postgres'
import { loadEnvConfig } from '@next/env'
import { fromString } from '@/lib/decimal'

loadEnvConfig(process.cwd())

const schemaName = `price_lists_it_${randomBytes(4).toString('hex')}`
if (!/^price_lists_it_[0-9a-f]{8}$/.test(schemaName)) throw new Error('Unsafe test schema name')
const baseDatabaseUrl = process.env.DATABASE_URL
if (!baseDatabaseUrl) throw new Error('DATABASE_URL is required')
const isolatedUrl = new URL(baseDatabaseUrl)
isolatedUrl.searchParams.set('options', `-c search_path=${schemaName}`)
process.env.DATABASE_URL = isolatedUrl.toString()
const admin = postgres(baseDatabaseUrl, { max: 1, prepare: false })
let sql: ReturnType<typeof postgres>
let repository: import('./price-list-repository').PriceListRepository
let actor: import('@/modules/access-control/domain/types').Principal
let marketId = 1
let productId = 1

const request = () => randomUUID()

async function addDraft(code: string) {
  const row = await repository.create({ actor, requestId: request(), marketId, values: {
    code, tier: 'MARKET', currency: 'USD', validFrom: '2026-01-01T00:00:00.000Z', validTo: null,
  } })
  const result = await repository.addItem({ actor, requestId: request(), marketId, listId: row.id, values: {
    productId, specificationVersionId: null, unit: 'KG', priceBasis: 'NET', unitPrice: '100.00',
    minQuantity: '1', maxQuantity: '100', validFrom: '2026-01-01T00:00:00.000Z', validTo: null,
  } })
  return { row, item: result.item }
}

beforeAll(async () => {
  const files = [
    'docs/structure/01_init_20261106.sql',
    'db/migrations/0001_access_control_runtime.sql',
    'db/migrations/0002_audit_events_append_only.sql',
    'db/migrations/0003_products_catalog.sql',
    'db/migrations/0004_product_specifications.sql',
    'db/migrations/0005_price_lists.sql',
  ]
  const migrations = await Promise.all(files.map((file) => readFile(path.join(process.cwd(), file), 'utf8')))
  await admin.unsafe(`CREATE SCHEMA "${schemaName}"`)
  const isolated = postgres(baseDatabaseUrl, { max: 1, prepare: false, connection: { search_path: schemaName } })
  try {
    for (const migration of migrations) await isolated.unsafe(migration)
    const [market] = await isolated<{ id: number }[]>`
      INSERT INTO markets (code, name_en, name_vi, default_currency, active)
      VALUES ('IT-PL', 'Price List Test', 'Test bảng giá', 'USD', true) RETURNING id
    `
    marketId = market.id
    const [user] = await isolated<{ id: number }[]>`
      INSERT INTO users (email, display_name, status)
      VALUES ('price-list-test@example.test', 'Price List Test', 'ACTIVE') RETURNING id
    `
    const [product] = await isolated<{ id: number }[]>`
      INSERT INTO products (sku, display_name, default_unit, status)
      VALUES ('PL-TEST-001', 'Test squid', 'KG', 'ACTIVE') RETURNING id
    `
    productId = product.id
    actor = { userId: user.id, sessionId: 1, displayName: 'Price List Test', email: 'price-list-test@example.test', roles: ['admin'], teamIds: [], marketIds: [marketId] }
  } finally {
    await isolated.end()
  }
  const repositoryModule = await import('./price-list-repository')
  repository = new repositoryModule.PriceListRepository()
  sql = postgres(baseDatabaseUrl, { max: 1, prepare: false, connection: { search_path: schemaName } })
}, 180_000)

afterAll(async () => {
  await sql?.end()
  await admin.unsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`)
  await admin.end()
})

describe('PriceListRepository isolated persistence', () => {
  it('writes list and selection audits atomically and preserves selection history', async () => {
    const { row, item } = await addDraft('IT-PRICE-001')
    const approved = await repository.approve({ actor, requestId: request(), marketId, id: row.id, version: row.version })
    const selection = await repository.recordSelection({ actor, requestId: request(), marketId, values: {
      productId, priceListItemId: item.id, selectedAmount: '100.0', currency: 'USD', unit: 'KG', priceBasis: 'NET', quantity: '2',
    } })
    expect(selection.selectionType).toBe('REFERENCE')
    expect(selection.listedAmount).toBe('100.00')
    const rows = await sql<{ action: string }[]>`SELECT action FROM audit_events WHERE market_id = ${marketId} ORDER BY id`
    expect(rows.map((value) => value.action)).toEqual(expect.arrayContaining(['price_list.created', 'price_list.item_added', 'price_list.approved', 'price_selection.recorded']))
    await repository.archive({ actor, requestId: request(), marketId, id: approved.id, version: approved.version, reason: 'No longer commercially current' })
    const [persisted] = await sql<{ selected_amount: string; id: number }[]>`SELECT selected_amount, id FROM price_selections WHERE id = ${selection.id}`
    const persistedAmount = fromString(persisted.selected_amount)
    expect(persistedAmount.units * BigInt(10) ** BigInt(2)).toBe(BigInt(10000) * BigInt(10) ** BigInt(persistedAmount.scale))
  })

  it('freezes approved items and rejects cross-market access', async () => {
    const { row, item } = await addDraft('IT-PRICE-002')
    await repository.approve({ actor, requestId: request(), marketId, id: row.id, version: row.version })
    await expect(sql`UPDATE price_list_items SET unit_price = 99 WHERE id = ${item.id}`).rejects.toMatchObject({ code: '55000' })
    await expect(repository.list({ actor: { ...actor, marketIds: [] }, marketId, limit: 10 })).rejects.toThrow()
  })

  it('allows exactly one concurrent approval for a version', async () => {
    const { row } = await addDraft('IT-PRICE-003')
    const outcomes = await Promise.allSettled([
      repository.approve({ actor, requestId: request(), marketId, id: row.id, version: row.version }),
      repository.approve({ actor, requestId: request(), marketId, id: row.id, version: row.version }),
    ])
    expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(outcomes.filter((result) => result.status === 'rejected')).toHaveLength(1)
  })

  it('rolls back a list insert when mandatory audit fails', async () => {
    await sql`CREATE OR REPLACE FUNCTION reject_price_list_audit_probe() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'price_list.created' THEN RAISE EXCEPTION 'audit unavailable'; END IF; RETURN NEW; END $$`
    await sql`CREATE TRIGGER reject_price_list_audit_probe BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION reject_price_list_audit_probe()`
    const before = await sql<{ count: number }[]>`SELECT COUNT(*)::integer AS count FROM price_lists`
    await expect(repository.create({ actor, requestId: request(), marketId, values: {
      code: 'IT-AUDIT-ROLLBACK', tier: 'MARKET', currency: 'USD', validFrom: '2026-01-01T00:00:00.000Z',
    } })).rejects.toThrow()
    const after = await sql<{ count: number }[]>`SELECT COUNT(*)::integer AS count FROM price_lists`
    expect(after[0].count).toBe(before[0].count)
    await sql`DROP TRIGGER reject_price_list_audit_probe ON audit_events`
    await sql`DROP FUNCTION reject_price_list_audit_probe()`
  })
})
