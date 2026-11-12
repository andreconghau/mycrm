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

function postgresErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  if ('code' in error && typeof error.code === 'string') return error.code
  if ('cause' in error) return postgresErrorCode(error.cause)
  return undefined
}

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
  const priceLists = await readFile(
    path.join(root, 'db/migrations/0005_price_lists.sql'),
    'utf8',
  )
  const priceListsDown = await readFile(
    path.join(root, 'db/migrations/0005_price_lists.down.sql'),
    'utf8',
  )
  const quotations = await readFile(
    path.join(root, 'db/migrations/0006_quotations.sql'),
    'utf8',
  )
  const quotationsDown = await readFile(
    path.join(root, 'db/migrations/0006_quotations.down.sql'),
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
    await isolated.unsafe(priceLists)
    await isolated.unsafe(quotations)

    const [quoteProbe] = await isolated<{ id: number }[]>`
      INSERT INTO quotations (market_id, rfq_id, number, owner_id)
      VALUES (1, 1, 'QT-MIGRATION-PROBE', 1)
      RETURNING id
    `
    const [versionProbe] = await isolated<{ id: number }[]>`
      INSERT INTO quotation_versions (market_id, quotation_id, rfq_id, revision_no, state, created_by)
      VALUES (1, ${quoteProbe.id}, 1, 1, 'DRAFT', 1)
      RETURNING id
    `
    const [incompleteLine] = await isolated<{ id: number }[]>`
      INSERT INTO quotation_lines (market_id, quotation_version_id, rfq_id, line_no)
      VALUES (1, ${versionProbe.id}, 1, 1)
      RETURNING id
    `
    let draftTransitionBlocked = false
    try {
      await isolated`UPDATE quotation_versions SET state = 'SUBMITTED' WHERE id = ${versionProbe.id}`
    } catch (error) {
      draftTransitionBlocked = postgresErrorCode(error) === '55000'
    }
    let versionDeleteBlocked = false
    try {
      await isolated`DELETE FROM quotation_versions WHERE id = ${versionProbe.id}`
    } catch (error) {
      versionDeleteBlocked = postgresErrorCode(error) === '55000'
    }
    let invalidRateBlocked = false
    try {
      await isolated`UPDATE quotation_versions SET vnd_per_usd = 0.00001 WHERE id = ${versionProbe.id}`
    } catch {
      invalidRateBlocked = true
    }
    let invalidExactTotalBlocked = false
    try {
      await isolated`UPDATE quotation_versions SET unrounded_usd_numerator = '1', unrounded_usd_denominator = NULL WHERE id = ${versionProbe.id}`
    } catch {
      invalidExactTotalBlocked = true
    }
    const [quotationForeignKeys] = await isolated<{ count: number }[]>`
      SELECT COUNT(*)::integer AS count
      FROM information_schema.table_constraints
      WHERE table_schema = ${schema}
        AND table_name IN ('quotations', 'quotation_versions', 'quotation_lines', 'quotation_adjustments')
        AND constraint_type = 'FOREIGN KEY'
    `
    if (!draftTransitionBlocked || !versionDeleteBlocked || !invalidRateBlocked || !invalidExactTotalBlocked || quotationForeignKeys.count) {
      throw new Error('Quotation migration did not enforce its draft, FX, exact-total and no-foreign-key contracts')
    }
    await isolated`DELETE FROM quotation_lines WHERE id = ${incompleteLine.id}`
    await isolated.unsafe(quotationsDown)
    const [quotationDown] = await isolated<{ numeratorColumn: number; linePriceBasisColumn: number; versionTrigger: number; childTrigger: number }[]>`
      SELECT
        (SELECT COUNT(*)::integer FROM information_schema.columns WHERE table_schema = ${schema} AND table_name = 'quotation_versions' AND column_name = 'unrounded_usd_numerator') AS "numeratorColumn",
        (SELECT COUNT(*)::integer FROM information_schema.columns WHERE table_schema = ${schema} AND table_name = 'quotation_lines' AND column_name IN ('price_basis', 'price_basis_note', 'price_selection_id')) AS "linePriceBasisColumn",
        (SELECT COUNT(*)::integer FROM information_schema.triggers WHERE trigger_schema = ${schema} AND trigger_name = 'quotation_versions_draft_only') AS "versionTrigger",
        (SELECT COUNT(*)::integer FROM information_schema.triggers WHERE trigger_schema = ${schema} AND trigger_name IN ('quotation_lines_draft_only', 'quotation_adjustments_draft_only')) AS "childTrigger"
    `
    if (quotationDown.numeratorColumn || quotationDown.linePriceBasisColumn || quotationDown.versionTrigger || quotationDown.childTrigger) {
      throw new Error('Quotation down migration left M10 schema objects behind')
    }

    const [priceGuards] = await isolated<
      { selectionTable: number; appendOnlyTrigger: number; itemGuard: number; itemDeleteGuard: number; hasForeignKey: number }[]
    >`
      SELECT
        (SELECT COUNT(*)::integer FROM information_schema.tables
          WHERE table_schema = ${schema} AND table_name = 'price_selections') AS "selectionTable",
        (SELECT COUNT(*)::integer FROM information_schema.triggers
          WHERE trigger_schema = ${schema} AND trigger_name = 'price_selections_append_only') AS "appendOnlyTrigger",
        (SELECT COUNT(*)::integer FROM information_schema.triggers
          WHERE trigger_schema = ${schema} AND trigger_name = 'price_list_items_immutable_after_approval') AS "itemGuard",
        (SELECT COUNT(*)::integer FROM information_schema.triggers
          WHERE trigger_schema = ${schema} AND trigger_name = 'price_list_items_delete_after_approval') AS "itemDeleteGuard",
        (SELECT COUNT(*)::integer FROM information_schema.table_constraints
          WHERE table_schema = ${schema} AND table_name = 'price_selections'
            AND constraint_type = 'FOREIGN KEY') AS "hasForeignKey"
    `
    if (
      !priceGuards.selectionTable ||
      !priceGuards.appendOnlyTrigger ||
      !priceGuards.itemGuard ||
      !priceGuards.itemDeleteGuard ||
      priceGuards.hasForeignKey
    ) {
      throw new Error('Price List migration did not create its expected guards or introduced a foreign key')
    }

    let invalidPriceListStatusRejected = false
    try {
      await isolated`
        INSERT INTO price_lists (
          market_id, code, tier, currency, valid_from, status, created_by
        ) VALUES (1, 'MIG-PRICE-INVALID-STATUS', 'MARKET', 'USD', now(), 'ACTIVE', 1)
      `
    } catch {
      invalidPriceListStatusRejected = true
    }
    if (!invalidPriceListStatusRejected) {
      throw new Error('Price List lifecycle CHECK accepted a derived ACTIVE state as stored status')
    }

    const [priceProbeProduct] = await isolated<{ id: number }[]>`
      INSERT INTO products (sku, display_name, default_unit, status)
      VALUES ('MIG-PRICE-001', 'Price migration probe', 'KG', 'ACTIVE')
      RETURNING id
    `
    const [priceList] = await isolated<{ id: number }[]>`
      INSERT INTO price_lists (
        market_id, code, tier, currency, valid_from, status, created_by
      ) VALUES (1, 'MIG-PRICE-001', 'MARKET', 'USD', now() - interval '1 day', 'DRAFT', 1)
      RETURNING id
    `
    const [priceItem] = await isolated<{ id: number }[]>`
      INSERT INTO price_list_items (
        market_id, price_list_id, product_id, unit, price_basis,
        unit_price, valid_from
      ) VALUES (1, ${priceList.id}, ${priceProbeProduct.id}, 'KG', 'NET', 10, now() - interval '1 day')
      RETURNING id
    `
    let otherBasisWithoutNoteRejected = false
    try {
      await isolated`
        INSERT INTO price_list_items (
          market_id, price_list_id, product_id, unit, price_basis,
          unit_price, valid_from
        ) VALUES (1, ${priceList.id}, ${priceProbeProduct.id}, 'KG', 'OTHER', 10, now())
      `
    } catch {
      otherBasisWithoutNoteRejected = true
    }
    if (!otherBasisWithoutNoteRejected) {
      throw new Error('OTHER price basis CHECK accepted an item without its note')
    }
    await isolated`
      UPDATE price_lists
      SET status = 'APPROVED', approved_by = 1, approved_at = now()
      WHERE id = ${priceList.id}
    `
    let approvedItemFrozen = false
    try {
      await isolated`UPDATE price_list_items SET unit_price = 11 WHERE id = ${priceItem.id}`
    } catch (error) {
      approvedItemFrozen = postgresErrorCode(error) === '55000'
    }
    let approvedItemDeleteBlocked = false
    try {
      await isolated`DELETE FROM price_list_items WHERE id = ${priceItem.id}`
    } catch (error) {
      approvedItemDeleteBlocked = postgresErrorCode(error) === '55000'
    }
    if (!approvedItemFrozen || !approvedItemDeleteBlocked) {
      throw new Error('Approved Price List item mutation guards did not reject a change')
    }

    let reasonlessManualRejected = false
    try {
      await isolated`
        INSERT INTO price_selections (
          market_id, context_type, product_id, selection_type, selected_amount,
          currency, unit, price_basis, quantity, selected_by, request_id
        ) VALUES (1, 'AD_HOC', ${priceProbeProduct.id}, 'MANUAL', 12, 'USD', 'KG', 'NET', 1, 1, ${randomUUID()})
      `
    } catch {
      reasonlessManualRejected = true
    }
    if (!reasonlessManualRejected) {
      throw new Error('Price selection reason CHECK accepted a reasonless MANUAL row')
    }

    const [selection] = await isolated<{ id: number }[]>`
      INSERT INTO price_selections (
        market_id, context_type, product_id, price_list_id, price_list_item_id,
        selection_type, listed_amount, selected_amount, currency, unit, price_basis,
        quantity, source_metadata, selected_by, request_id
      ) VALUES (
        1, 'AD_HOC', ${priceProbeProduct.id}, ${priceList.id}, ${priceItem.id},
        'REFERENCE', 10, 10.00, 'USD', 'KG', 'NET', 1, '{}', 1, ${randomUUID()}
      ) RETURNING id
    `
    let selectionUpdateBlocked = false
    try {
      await isolated`UPDATE price_selections SET selected_amount = 11 WHERE id = ${selection.id}`
    } catch {
      selectionUpdateBlocked = true
    }
    let selectionDeleteBlocked = false
    try {
      await isolated`DELETE FROM price_selections WHERE id = ${selection.id}`
    } catch {
      selectionDeleteBlocked = true
    }
    if (!selectionUpdateBlocked || !selectionDeleteBlocked) {
      throw new Error('Price selection append-only trigger did not reject UPDATE and DELETE')
    }

    await isolated.unsafe(priceListsDown)
    const [priceDown] = await isolated<{ selectionTable: number; guardTrigger: number; listColumn: number }[]>`
      SELECT
        (SELECT COUNT(*)::integer FROM information_schema.tables
          WHERE table_schema = ${schema} AND table_name = 'price_selections') AS "selectionTable",
        (SELECT COUNT(*)::integer FROM information_schema.triggers
          WHERE trigger_schema = ${schema}
            AND trigger_name IN ('price_selections_append_only', 'price_list_items_immutable_after_approval', 'price_list_items_delete_after_approval')) AS "guardTrigger",
        (SELECT COUNT(*)::integer FROM information_schema.columns
          WHERE table_schema = ${schema} AND table_name = 'price_lists' AND column_name = 'created_by') AS "listColumn"
    `
    if (priceDown.selectionTable || priceDown.guardTrigger || priceDown.listColumn) {
      throw new Error('Price List down migration left M08 schema objects behind')
    }

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
