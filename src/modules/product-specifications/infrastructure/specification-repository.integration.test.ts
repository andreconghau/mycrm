/** M07 persistence and transaction checks against isolated real PostgreSQL. */
import { randomBytes, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import postgres from 'postgres'
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

const schemaName = `specifications_it_${randomBytes(4).toString('hex')}`
if (!/^specifications_it_[0-9a-f]{8}$/.test(schemaName))
  throw new Error('Unsafe test schema name')
const baseDatabaseUrl = process.env.DATABASE_URL
if (!baseDatabaseUrl) throw new Error('DATABASE_URL is required')
const isolatedUrl = new URL(baseDatabaseUrl)
isolatedUrl.searchParams.set('options', `-c search_path=${schemaName}`)
process.env.DATABASE_URL = isolatedUrl.toString()
const admin = postgres(baseDatabaseUrl, { max: 1, prepare: false })

type Principal = import('@/modules/access-control/domain/types').Principal
type Repository = import('./specification-repository').SpecificationRepository
let repository: Repository
let specificationImmutableError: typeof import('./specification-repository').SpecificationImmutableError
let conflictError: typeof import('./specification-repository').SpecificationConflictError
let sqlClient: ReturnType<typeof postgres>
let actor: Principal
const MARKET_ID = 1
const PRODUCT_ID = 1
const USER_ID = 1
const request = () => randomUUID()

const validRevision = () => ({
  nameEn: 'Vannamei shrimp',
  nameVi: 'Tôm thẻ',
  nameKo: '흰다리새우',
  grade: 'A',
  processing: 'PDTO',
  netWeightPerPack: '1.000',
  weightUnit: 'KG',
  packsPerCarton: 10,
  uom: 'CTN',
  packaging: 'IQF bag',
})

async function createSpecification() {
  return repository.create({
    actor,
    requestId: request(),
    marketId: MARKET_ID,
    productId: PRODUCT_ID,
    values: validRevision(),
  })
}

beforeAll(async () => {
  const baseline = await readFile(
    path.join(process.cwd(), 'docs/structure/01_init_20261106.sql'),
    'utf8',
  )
  const migration0003 = await readFile(
    path.join(process.cwd(), 'db/migrations/0003_products_catalog.sql'),
    'utf8',
  )
  const migration0004 = await readFile(
    path.join(process.cwd(), 'db/migrations/0004_product_specifications.sql'),
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
    await isolated.unsafe(migration0003)
    await isolated.unsafe(migration0004)
  } finally {
    await isolated.end()
  }
  const repositoryModule = await import('./specification-repository')
  repository = new repositoryModule.SpecificationRepository()
  specificationImmutableError = repositoryModule.SpecificationImmutableError
  conflictError = repositoryModule.SpecificationConflictError
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
  await sqlClient`TRUNCATE specification_versions, specifications, file_attachments, product_aliases, products, customers, markets, audit_events, users RESTART IDENTITY CASCADE`
  await sqlClient`INSERT INTO users (id, email, display_name, status) VALUES (${USER_ID}, 'admin@example.test', 'Admin', 'ACTIVE')`
  await sqlClient`INSERT INTO markets (id, code, name_en, name_vi, default_currency) VALUES (${MARKET_ID}, 'KR', 'Korea', 'Hàn Quốc', 'USD')`
  await sqlClient`INSERT INTO markets (id, code, name_en, name_vi, default_currency) VALUES (2, 'JP', 'Japan', 'Nhật Bản', 'USD')`
  await sqlClient`INSERT INTO products (id, sku, display_name, default_unit, status) VALUES (${PRODUCT_ID}, 'SQ-001', 'Squid', 'KG', 'ACTIVE')`
  await sqlClient`INSERT INTO product_aliases (product_id, locale, label, kind) VALUES (${PRODUCT_ID}, 'en', 'Squid', 'NAME'), (${PRODUCT_ID}, 'vi', 'Mực', 'NAME'), (${PRODUCT_ID}, 'ko', '오징어', 'NAME')`
  await sqlClient`INSERT INTO customers (id, market_id, code, legal_name, country_code, status, owner_id) VALUES (1, ${MARKET_ID}, 'BUYER-KR', 'Korea Buyer', 'KR', 'ACTIVE', ${USER_ID}), (2, 2, 'BUYER-JP', 'Japan Buyer', 'JP', 'ACTIVE', ${USER_ID})`
  actor = {
    userId: USER_ID,
    sessionId: 1,
    displayName: 'Admin',
    email: 'admin@example.test',
    roles: ['admin'],
    teamIds: [],
    marketIds: [MARKET_ID],
  }
})

describe('M07 specification repository', () => {
  it('creates a market-scoped draft and mandatory audit event', async () => {
    const spec = await createSpecification()
    expect(spec.code).toBe('SQ-001-S01')
    expect(spec.revisions[0]).toMatchObject({ revisionNo: 1, status: 'DRAFT' })
    const [audit] =
      await sqlClient`SELECT action, resource_id, result FROM audit_events WHERE action = 'specification.created'`
    expect(audit).toMatchObject({
      action: 'specification.created',
      resource_id: spec.id,
      result: 'SUCCESS',
    })
  })

  it('keeps buyer specifications separate and rejects a buyer from another market', async () => {
    const standard = await createSpecification()
    const buyerSpecific = await repository.create({
      actor,
      requestId: request(),
      marketId: MARKET_ID,
      productId: PRODUCT_ID,
      customerId: 1,
      values: { ...validRevision(), packaging: 'Buyer-only pack' },
    })
    expect(standard.id).not.toBe(buyerSpecific.id)
    expect(buyerSpecific.customerId).toBe(1)
    expect(buyerSpecific.code).not.toBe(standard.code)
    await expect(
      repository.create({
        actor,
        requestId: request(),
        marketId: MARKET_ID,
        productId: PRODUCT_ID,
        customerId: 2,
        values: validRevision(),
      }),
    ).rejects.toThrow('buyer is not available in this market')
    const unchangedStandard = await repository.get(
      actor,
      MARKET_ID,
      standard.id,
    )
    expect(unchangedStandard.currentRevision.packaging).toBe('IQF bag')
  })

  it('keeps an approved revision immutable and clones a successor without changing it', async () => {
    const spec = await createSpecification()
    const draft = spec.revisions[0]
    const approved = await repository.publishRevision({
      actor,
      requestId: request(),
      marketId: MARKET_ID,
      specificationId: spec.id,
      revisionNo: 1,
      revisionVersion: draft.version,
    })
    await expect(
      repository.updateRevision({
        actor,
        requestId: request(),
        marketId: MARKET_ID,
        specificationId: spec.id,
        revisionNo: 1,
        revisionVersion: approved.version,
        patch: { grade: 'B' },
      }),
    ).rejects.toBeInstanceOf(specificationImmutableError)
    await expect(
      sqlClient`UPDATE specification_versions SET grade = 'B' WHERE id = ${approved.id}`,
    ).rejects.toMatchObject({ code: '55000' })
    const current = await repository.get(actor, MARKET_ID, spec.id)
    const next = await repository.createRevision({
      actor,
      requestId: request(),
      marketId: MARKET_ID,
      specificationId: spec.id,
      specificationVersion: current.version,
      sourceRevisionNo: 1,
      patch: { packaging: 'New IQF bag' },
    })
    expect(next).toMatchObject({
      revisionNo: 2,
      status: 'DRAFT',
      packaging: 'New IQF bag',
    })
    const history = await repository.listRevisions(actor, MARKET_ID, spec.id)
    expect(history[0]).toMatchObject({
      revisionNo: 1,
      status: 'APPROVED',
      grade: 'A',
      packaging: 'IQF bag',
    })
  })

  it('serializes concurrent attempts to approve the same draft', async () => {
    const spec = await createSpecification()
    const draft = spec.revisions[0]
    const publish = () =>
      repository.publishRevision({
        actor,
        requestId: request(),
        marketId: MARKET_ID,
        specificationId: spec.id,
        revisionNo: 1,
        revisionVersion: draft.version,
      })
    const outcomes = await Promise.allSettled([publish(), publish()])
    expect(
      outcomes.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1)
    expect(
      outcomes.find((result) => result.status === 'rejected'),
    ).toMatchObject({ reason: expect.any(conflictError) })
    const approved =
      await sqlClient`SELECT id FROM specification_versions WHERE specification_id = ${spec.id} AND status = 'APPROVED'`
    expect(approved).toHaveLength(1)
  })

  it('preserves an approved revision snapshot in a historical quotation line', async () => {
    const spec = await createSpecification()
    const firstDraft = spec.revisions[0]
    await repository.publishRevision({
      actor,
      requestId: request(),
      marketId: MARKET_ID,
      specificationId: spec.id,
      revisionNo: 1,
      revisionVersion: firstDraft.version,
    })
    const v1 = await repository.buildOfferSnapshot({
      actor,
      marketId: MARKET_ID,
      specificationId: spec.id,
      revisionNo: 1,
      requireApproved: true,
      capturedAt: new Date('2026-11-11T00:00:00.000Z'),
    })
    await sqlClient`INSERT INTO quotation_lines (market_id, quotation_version_id, rfq_id, line_no, product_id, specification_version_id, quantity, unit, input_currency, input_unit_price, original_line_amount, converted_usd_amount, product_snapshot, specification_snapshot, selected_by, selected_at) VALUES (${MARKET_ID}, 1, 1, 1, ${PRODUCT_ID}, ${firstDraft.id}, 10, 'CTN', 'USD', 1, 10, 10, ${JSON.stringify({ sku: 'SQ-001' })}::jsonb, ${JSON.stringify(v1)}::jsonb, ${USER_ID}, now())`
    const current = await repository.get(actor, MARKET_ID, spec.id)
    const secondDraft = await repository.createRevision({
      actor,
      requestId: request(),
      marketId: MARKET_ID,
      specificationId: spec.id,
      specificationVersion: current.version,
      sourceRevisionNo: 1,
      patch: { packaging: 'Revised pack' },
    })
    await repository.publishRevision({
      actor,
      requestId: request(),
      marketId: MARKET_ID,
      specificationId: spec.id,
      revisionNo: 2,
      revisionVersion: secondDraft.version,
    })
    const [stored] =
      await sqlClient`SELECT specification_snapshot FROM quotation_lines WHERE market_id = ${MARKET_ID} AND quotation_version_id = 1 AND line_no = 1`
    const storedSnapshot =
      typeof stored.specification_snapshot === 'string'
        ? JSON.parse(stored.specification_snapshot)
        : stored.specification_snapshot
    expect(storedSnapshot).toEqual(v1)
    const history = await repository.listRevisions(actor, MARKET_ID, spec.id)
    expect(history[0]).toMatchObject({
      revisionNo: 1,
      status: 'ARCHIVED',
      packaging: 'IQF bag',
    })
  })

  it('rolls back specification creation when mandatory audit insertion fails', async () => {
    await sqlClient.unsafe(
      `CREATE FUNCTION reject_spec_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit unavailable'; END $$`,
    )
    await sqlClient.unsafe(
      `CREATE TRIGGER reject_spec_audit BEFORE INSERT ON audit_events FOR EACH ROW WHEN (NEW.action = 'specification.created') EXECUTE FUNCTION reject_spec_audit()`,
    )
    await expect(createSpecification()).rejects.toThrow(/audit_events/)
    const rows = await sqlClient`SELECT id FROM specifications`
    expect(rows).toHaveLength(0)
    await sqlClient.unsafe('DROP TRIGGER reject_spec_audit ON audit_events')
    await sqlClient.unsafe('DROP FUNCTION reject_spec_audit()')
  })
})
