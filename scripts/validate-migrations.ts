import { randomBytes, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { loadEnvConfig } from '@next/env'
import postgres from 'postgres'

loadEnvConfig(process.cwd())
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required')

const schema = `migration_validation_${randomBytes(4).toString('hex')}`
if (!/^migration_validation_[0-9a-f]{8}$/.test(schema)) {
  throw new Error('Unsafe validation schema name')
}

const admin = postgres(databaseUrl, { max: 1, prepare: false })
const isolated = postgres(databaseUrl, {
  max: 1,
  prepare: false,
  connection: { search_path: schema },
})

async function main() {
  const root = process.cwd()
  const baseline = await readFile(
    path.join(root, 'docs/structure/01_init_20261106.sql'),
    'utf8',
  )
  const runtime = await readFile(
    path.join(root, 'db/migrations/0001_access_control_runtime.sql'),
    'utf8',
  )
  const appendOnly = await readFile(
    path.join(root, 'db/migrations/0002_audit_events_append_only.sql'),
    'utf8',
  )
  const appendOnlyDown = await readFile(
    path.join(root, 'db/migrations/0002_audit_events_append_only.down.sql'),
    'utf8',
  )
  const productsCatalog = await readFile(
    path.join(root, 'db/migrations/0003_products_catalog.sql'),
    'utf8',
  )
  const productsCatalogDown = await readFile(
    path.join(root, 'db/migrations/0003_products_catalog.down.sql'),
    'utf8',
  )
  const productSpecifications = await readFile(
    path.join(root, 'db/migrations/0004_product_specifications.sql'),
    'utf8',
  )
  const productSpecificationsDown = await readFile(
    path.join(root, 'db/migrations/0004_product_specifications.down.sql'),
    'utf8',
  )
  await admin.unsafe(`CREATE SCHEMA "${schema}"`)
  try {
    await isolated.unsafe(baseline)
    await isolated.unsafe(runtime)
    await isolated.unsafe(appendOnly)
    const [result] = await isolated<
      { tableCount: number; limiterComment: string | null }[]
    >`
      SELECT
        COUNT(*)::integer AS "tableCount",
        obj_description(to_regclass('auth_rate_limits')) AS "limiterComment"
      FROM information_schema.tables
      WHERE table_schema = ${schema}
    `
    if (result.tableCount !== 64 || !result.limiterComment) {
      throw new Error(
        `Unexpected isolated schema result: ${result.tableCount} tables, comment=${Boolean(result.limiterComment)}`,
      )
    }
    const [event] = await isolated<{ id: number }[]>`
      INSERT INTO audit_events (actor_id, action, resource_type, request_id, result)
      VALUES (1, 'validation.insert', 'test', ${randomUUID()}, 'SUCCESS')
      RETURNING id
    `
    let updateBlocked = false
    try {
      await isolated`UPDATE audit_events SET action = 'validation.changed' WHERE id = ${event.id}`
    } catch {
      updateBlocked = true
    }
    let deleteBlocked = false
    try {
      await isolated`DELETE FROM audit_events WHERE id = ${event.id}`
    } catch {
      deleteBlocked = true
    }
    if (!updateBlocked || !deleteBlocked) {
      throw new Error('Append-only migration did not reject UPDATE and DELETE')
    }
    await isolated.unsafe(
      'CREATE TABLE audit_atomicity_probe (id integer PRIMARY KEY)',
    )
    let auditFailureRolledBack = false
    try {
      await isolated.begin(async (transaction) => {
        await transaction`INSERT INTO audit_atomicity_probe (id) VALUES (1)`
        await transaction`
          INSERT INTO audit_events (actor_id, action, resource_type, request_id, result)
          VALUES (1, 'validation.failure', 'test', 'invalid-uuid', 'SUCCESS')
        `
      })
    } catch {
      auditFailureRolledBack = true
    }
    const [{ probeCount }] = await isolated<{ probeCount: number }[]>`
      SELECT COUNT(*)::integer AS "probeCount" FROM audit_atomicity_probe
    `
    if (!auditFailureRolledBack || probeCount !== 0) {
      throw new Error(
        'Mandatory audit insert failure did not roll back the business transaction',
      )
    }
    // --- R1-05 catalog and R1-06 specification migrations ------------------
    await isolated.unsafe(productsCatalog)
    await isolated.unsafe(productSpecifications)

    const [guards] = await isolated<
      { approvalIndex: number; immutabilityTrigger: number }[]
    >`
      SELECT
        (
          SELECT COUNT(*)::integer FROM pg_indexes
          WHERE schemaname = ${schema}
            AND indexname = 'specification_versions_one_approved'
        ) AS "approvalIndex",
        (
          SELECT COUNT(*)::integer FROM information_schema.triggers
          WHERE trigger_schema = ${schema}
            AND trigger_name = 'specification_versions_immutable_after_approval'
        ) AS "immutabilityTrigger"
    `
    if (!guards.approvalIndex || !guards.immutabilityTrigger) {
      throw new Error(
        'Specification migration did not create the single-approval index and immutability trigger',
      )
    }

    const [probeProduct] = await isolated<{ id: number }[]>`
      INSERT INTO products (sku, display_name, default_unit, status)
      VALUES ('MIG-PROBE-001', 'Migration probe squid', 'KG', 'ACTIVE')
      RETURNING id
    `
    const [probeSpecification] = await isolated<{ id: number }[]>`
      INSERT INTO specifications (market_id, product_id, code)
      VALUES (1, ${probeProduct.id}, 'MIG-PROBE-001-S01')
      RETURNING id
    `
    const [approvedRevision] = await isolated<{ id: number }[]>`
      INSERT INTO specification_versions (
        market_id, specification_id, product_id, revision_no, status,
        created_by, approved_by, published_at
      )
      VALUES (
        1, ${probeSpecification.id}, ${probeProduct.id}, 1, 'APPROVED',
        1, 1, now()
      )
      RETURNING id
    `

    // At most one APPROVED revision per specification (AC-16).
    let secondApprovalRejected = false
    try {
      await isolated`
        INSERT INTO specification_versions (
          market_id, specification_id, product_id, revision_no, status,
          created_by, approved_by, published_at
        )
        VALUES (
          1, ${probeSpecification.id}, ${probeProduct.id}, 2, 'APPROVED',
          1, 1, now()
        )
      `
    } catch {
      secondApprovalRejected = true
    }

    // Approved content is frozen at the database level (AC-04).
    let approvedContentFrozen = false
    try {
      await isolated`
        UPDATE specification_versions SET grade = 'A'
        WHERE id = ${approvedRevision.id}
      `
    } catch {
      approvedContentFrozen = true
    }

    // Archiving an approved revision stays possible.
    await isolated`
      UPDATE specification_versions
      SET status = 'ARCHIVED', archived_at = now()
      WHERE id = ${approvedRevision.id}
    `
    let archivedReopenBlocked = false
    try {
      await isolated`
        UPDATE specification_versions SET status = 'DRAFT'
        WHERE id = ${approvedRevision.id}
      `
    } catch {
      archivedReopenBlocked = true
    }

    if (
      !secondApprovalRejected ||
      !approvedContentFrozen ||
      !archivedReopenBlocked
    ) {
      throw new Error(
        'Specification single-approval, content-immutability or archive guards did not hold',
      )
    }

    await isolated.unsafe(productSpecificationsDown)
    const [specificationDown] = await isolated<
      { approvalIndex: number; immutabilityTrigger: number }[]
    >`
      SELECT
        (
          SELECT COUNT(*)::integer FROM pg_indexes
          WHERE schemaname = ${schema}
            AND indexname = 'specification_versions_one_approved'
        ) AS "approvalIndex",
        (
          SELECT COUNT(*)::integer FROM information_schema.triggers
          WHERE trigger_schema = ${schema}
            AND trigger_name = 'specification_versions_immutable_after_approval'
        ) AS "immutabilityTrigger"
    `
    if (
      specificationDown.approvalIndex ||
      specificationDown.immutabilityTrigger
    ) {
      throw new Error(
        'Specification down migration left the approval guard objects behind',
      )
    }
    await isolated.unsafe(productsCatalogDown)

    await isolated.unsafe(appendOnlyDown)
    const [{ triggerCount }] = await isolated<{ triggerCount: number }[]>`
      SELECT COUNT(*)::integer AS "triggerCount"
      FROM information_schema.triggers
      WHERE trigger_schema = ${schema} AND trigger_name = 'audit_events_append_only'
    `
    if (triggerCount !== 0)
      throw new Error('Append-only down migration did not remove the trigger')
    process.stdout.write(
      `Migration replay, append-only, rollback, and down-migration checks passed in isolated schema ${schema}: ${result.tableCount} tables.\n`,
    )
  } finally {
    await isolated.end()
    await admin.unsafe(`DROP SCHEMA "${schema}" CASCADE`)
  }
}

main()
  .finally(() => admin.end())
  .catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : 'Validation failed'}\n`,
    )
    process.exitCode = 1
  })
