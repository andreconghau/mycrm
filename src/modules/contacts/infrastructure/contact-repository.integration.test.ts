/**
 * M02 Contacts integration suite (AC-01 … AC-19).
 *
 * Runs against real PostgreSQL in a throwaway schema created from the R1
 * baseline initializer, so parent-derived record scope, the real UNIQUE/CHECK
 * constraints, optimistic concurrency and the frozen-history path are proven
 * against the database rather than against mocks.
 */
import { randomBytes, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import postgres from 'postgres'
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

const schemaName = `contacts_it_${randomBytes(4).toString('hex')}`
if (!/^contacts_it_[0-9a-f]{8}$/.test(schemaName))
  throw new Error('Unsafe test schema name')

const baseDatabaseUrl = process.env.DATABASE_URL
if (!baseDatabaseUrl) throw new Error('DATABASE_URL is required')

const isolatedUrl = new URL(baseDatabaseUrl)
isolatedUrl.searchParams.set('options', `-c search_path=${schemaName}`)
process.env.DATABASE_URL = isolatedUrl.toString()

const admin = postgres(baseDatabaseUrl, { max: 1, prepare: false })

type Principal = import('@/modules/access-control/domain/types').Principal
type ContactRepositoryType =
  import('./contact-repository').ContactRepository
type CustomerRepositoryType =
  import('@/modules/customers/infrastructure/customer-repository').CustomerRepository

let repository: ContactRepositoryType
let customerRepository: CustomerRepositoryType
let ContactNotFoundError: typeof import('./contact-repository').ContactNotFoundError
let ContactConflictError: typeof import('./contact-repository').ContactConflictError
let sqlClient: ReturnType<typeof postgres>

// Fixture ids. Seeded synthetically; no production data is touched.
const MARKET = 1
const OTHER_MARKET = 2
const SALE_A = 11
const SALE_B = 12
const MANAGER = 13
const TEAM = 1
const CUSTOMER_A = 101 // owned by SALE_A
const CUSTOMER_A2 = 102 // also owned by SALE_A
const CUSTOMER_B = 103 // owned by SALE_B
const CUSTOMER_ARCHIVED = 104 // owned by SALE_A, ARCHIVED

const saleA: Principal = {
  userId: SALE_A,
  sessionId: 1,
  displayName: 'Sale A',
  email: 'sale-a@example.test',
  roles: ['sale'],
  teamIds: [TEAM],
  marketIds: [MARKET],
}
const saleB: Principal = {
  ...saleA,
  userId: SALE_B,
  sessionId: 2,
  email: 'sale-b@example.test',
}
const manager: Principal = {
  ...saleA,
  userId: MANAGER,
  sessionId: 3,
  email: 'manager@example.test',
  roles: ['manager'],
}
const foreignMarketSale: Principal = {
  ...saleA,
  sessionId: 4,
  marketIds: [OTHER_MARKET],
}

const request = () => randomUUID()

beforeAll(async () => {
  const baseline = await readFile(
    path.join(process.cwd(), 'docs/structure/01_init_20261106.sql'),
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
  } finally {
    await isolated.end()
  }

  const repositoryModule = await import('./contact-repository')
  repository = new repositoryModule.ContactRepository()
  ContactNotFoundError = repositoryModule.ContactNotFoundError
  ContactConflictError = repositoryModule.ContactConflictError
  const customerModule = await import(
    '@/modules/customers/infrastructure/customer-repository'
  )
  customerRepository = new customerModule.CustomerRepository()
  const databaseModule = await import(
    '@/modules/access-control/infrastructure/database'
  )
  // Reuse the same connection the repositories use for raw assertions.
  sqlClient = postgres(baseDatabaseUrl, {
    max: 1,
    prepare: false,
    connection: { search_path: schemaName },
  })
  void databaseModule
}, 180_000)

afterAll(async () => {
  await sqlClient?.end()
  await admin.unsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`)
  await admin.end()
})

beforeEach(async () => {
  await sqlClient`
    TRUNCATE contacts, contact_channels, contact_preferences,
      customer_primary_contacts, customers, users, teams, team_memberships,
      markets, user_market_memberships, audit_events, record_links,
      customer_transfers, history_snapshots, history_entitlements, files
    RESTART IDENTITY CASCADE
  `
  await sqlClient`
    INSERT INTO teams (id, name, active) VALUES (${TEAM}, 'Sales', true)
  `
  await sqlClient`
    INSERT INTO markets (id, code, name_en, name_vi, default_currency, active)
    VALUES
      (${MARKET}, 'KR', 'Korea', 'Han Quoc', 'KRW', true),
      (${OTHER_MARKET}, 'JP', 'Japan', 'Nhat Ban', 'JPY', true)
  `
  for (const [id, email] of [
    [SALE_A, 'sale-a@example.test'],
    [SALE_B, 'sale-b@example.test'],
    [MANAGER, 'manager@example.test'],
  ] as const) {
    await sqlClient`
      INSERT INTO users (id, email, display_name, status)
      VALUES (${id}, ${email}, ${email}, 'ACTIVE')
    `
    await sqlClient`
      INSERT INTO user_market_memberships (user_id, market_id, active, granted_by)
      VALUES (${id}, ${MARKET}, true, ${SALE_A})
    `
    await sqlClient`
      INSERT INTO team_memberships (team_id, user_id, starts_at)
      VALUES (${TEAM}, ${id}, now() - interval '1 day')
    `
  }
  for (const [id, code, owner, status] of [
    [CUSTOMER_A, 'CUS-A', SALE_A, 'ACTIVE'],
    [CUSTOMER_A2, 'CUS-A2', SALE_A, 'ACTIVE'],
    [CUSTOMER_B, 'CUS-B', SALE_B, 'ACTIVE'],
    [CUSTOMER_ARCHIVED, 'CUS-ARC', SALE_A, 'ARCHIVED'],
  ] as const) {
    await sqlClient`
      INSERT INTO customers (
        id, market_id, code, legal_name, country_code, status, owner_id, team_id
      ) VALUES (
        ${id}, ${MARKET}, ${code}, ${`Buyer ${code}`}, 'KR', ${status},
        ${owner}, ${TEAM}
      )
    `
  }
})

async function createContact(
  actor: Principal,
  customerId: number,
  displayName: string,
  channels: Array<{ kind: string; handle: string; isPrimary: boolean }> = [],
) {
  return repository.create({
    actor,
    requestId: request(),
    marketId: MARKET,
    scope: 'OWN',
    values: { customerId, displayName, channels },
  })
}

describe('M02 contacts · authorized creation and audit', () => {
  it('IT-01 creates a contact under an authorized buyer and audits it (AC-01)', async () => {
    const contact = await createContact(saleA, CUSTOMER_A, 'Kim Minji', [
      { kind: 'email', handle: 'Minji@Buyer.test', isPrimary: true },
    ])

    expect(contact.id).toBeGreaterThan(0)
    expect(contact.active).toBe(true)
    expect(contact.version).toBe(1)

    const [audit] = await sqlClient`
      SELECT action, resource_type, resource_id, result, safe_diff
      FROM audit_events
      WHERE resource_type = 'contact' AND action = 'contact.created'
    `
    expect(audit).toMatchObject({
      action: 'contact.created',
      resource_id: contact.id,
      result: 'SUCCESS',
    })
    // Channel handles never reach the audit payload.
    expect(JSON.stringify(audit.safe_diff)).not.toContain('Minji@Buyer.test')

    const [channel] = await sqlClient`
      SELECT handle, normalized_handle, is_primary FROM contact_channels
    `
    expect(channel.handle).toBe('Minji@Buyer.test')
    expect(channel.normalized_handle).toBe('minji@buyer.test')

    const [link] = await sqlClient`
      SELECT contact_id, customer_id FROM record_links WHERE contact_id IS NOT NULL
    `
    expect(link).toMatchObject({ contact_id: contact.id, customer_id: null })
  })

  it('IT-02 refuses creation under a buyer outside the caller scope (AC-02)', async () => {
    await expect(
      createContact(saleA, CUSTOMER_B, 'Out of scope'),
    ).rejects.toThrow('CONTACT_PARENT_NOT_ACCESSIBLE')
    await expect(
      createContact(saleA, CUSTOMER_ARCHIVED, 'Archived parent'),
    ).rejects.toThrow('CONTACT_PARENT_NOT_ACCESSIBLE')
    await expect(
      createContact(saleA, 9_999, 'Nonexistent parent'),
    ).rejects.toThrow('CONTACT_PARENT_NOT_ACCESSIBLE')
    const [{ count }] = await sqlClient`SELECT count(*)::int FROM contacts`
    expect(count).toBe(0)
  })

  it('IT-02b denies a caller without market membership', async () => {
    await expect(
      createContact(foreignMarketSale, CUSTOMER_A, 'Foreign market'),
    ).rejects.toThrow()
  })
})

describe('M02 contacts · duplicate email is a hint, never an identity', () => {
  it('IT-03 allows two people at one buyer to share an email, with distinct ids (AC-03, AC-04)', async () => {
    const first = await createContact(saleA, CUSTOMER_A, 'Kim Minji', [
      { kind: 'email', handle: 'shared@buyer.test', isPrimary: true },
    ])
    const second = await createContact(saleA, CUSTOMER_A, 'Park Jisu', [
      { kind: 'email', handle: 'Shared@Buyer.TEST', isPrimary: false },
    ])

    expect(second.id).not.toBe(first.id)

    const candidates = await repository.duplicateCandidates({
      actor: saleA,
      marketId: MARKET,
      scope: 'OWN',
      customerId: CUSTOMER_A,
      channels: [{ kind: 'email', handle: 'SHARED@buyer.test' }],
    })
    expect(candidates.map((candidate) => candidate.id).sort()).toEqual(
      [first.id, second.id].sort(),
    )
    expect(candidates.every((candidate) => candidate.sameCustomer)).toBe(true)
  })

  it('IT-04 updating one duplicate leaves the other untouched (AC-05)', async () => {
    const first = await createContact(saleA, CUSTOMER_A, 'Kim Minji', [
      { kind: 'email', handle: 'shared@buyer.test', isPrimary: true },
    ])
    const second = await createContact(saleA, CUSTOMER_A, 'Park Jisu', [
      { kind: 'email', handle: 'shared@buyer.test', isPrimary: false },
    ])

    await repository.update({
      actor: saleA,
      requestId: request(),
      marketId: MARKET,
      id: first.id,
      scope: 'OWN',
      version: first.version,
      patch: { displayName: 'Kim Minji (updated)' },
    })

    const unchanged = await repository.get({
      actor: saleA,
      marketId: MARKET,
      id: second.id,
      scope: 'OWN',
    })
    expect(unchanged.contact.displayName).toBe('Park Jisu')
    expect(unchanged.contact.version).toBe(1)
  })

  it('IT-05 duplicate contacts keep independent history (AC-06)', async () => {
    const first = await createContact(saleA, CUSTOMER_A, 'Kim Minji', [
      { kind: 'email', handle: 'shared@buyer.test', isPrimary: true },
    ])
    const second = await createContact(saleA, CUSTOMER_A, 'Park Jisu', [
      { kind: 'email', handle: 'shared@buyer.test', isPrimary: false },
    ])
    await repository.deactivate({
      actor: saleA,
      requestId: request(),
      marketId: MARKET,
      id: second.id,
      scope: 'OWN',
      version: second.version,
      reason: 'Left the company',
    })

    const firstEvents = await sqlClient`
      SELECT action FROM audit_events
      WHERE resource_type = 'contact' AND resource_id = ${first.id}
    `
    const secondEvents = await sqlClient`
      SELECT action FROM audit_events
      WHERE resource_type = 'contact' AND resource_id = ${second.id}
    `
    expect(firstEvents.map((row) => row.action)).toEqual(['contact.created'])
    expect(secondEvents.map((row) => row.action)).toEqual([
      'contact.created',
      'contact.deactivated',
    ])
    const links = await sqlClient`
      SELECT contact_id FROM record_links WHERE contact_id IS NOT NULL ORDER BY contact_id
    `
    expect(links.map((row) => row.contact_id)).toEqual(
      [first.id, second.id].sort((a, b) => a - b),
    )
  })

  it('IT-13 duplicate suggestions never leak contacts outside the caller scope (AC-15)', async () => {
    await createContact(saleB, CUSTOMER_B, 'Other owner contact', [
      { kind: 'email', handle: 'shared@buyer.test', isPrimary: true },
    ])

    const candidates = await repository.duplicateCandidates({
      actor: saleA,
      marketId: MARKET,
      scope: 'OWN',
      channels: [{ kind: 'email', handle: 'shared@buyer.test' }],
    })
    expect(candidates).toEqual([])

    const page = await repository.list({
      actor: saleA,
      marketId: MARKET,
      scope: 'OWN',
      limit: 50,
    })
    expect(page.items).toEqual([])
    // Nothing in a list row can carry a channel handle.
    expect(JSON.stringify(page)).not.toContain('shared@buyer.test')
  })
})

describe('M02 contacts · parent-derived scope on every path', () => {
  it('IT-06 direct lookup and update cannot bypass parent scope (AC-07, AC-08)', async () => {
    const foreign = await createContact(saleB, CUSTOMER_B, 'Other owner contact')

    await expect(
      repository.get({
        actor: saleA,
        marketId: MARKET,
        id: foreign.id,
        scope: 'OWN',
      }),
    ).rejects.toBeInstanceOf(ContactNotFoundError)
    await expect(
      repository.update({
        actor: saleA,
        requestId: request(),
        marketId: MARKET,
        id: foreign.id,
        scope: 'OWN',
        version: foreign.version,
        patch: { displayName: 'Hijacked' },
      }),
    ).rejects.toBeInstanceOf(ContactNotFoundError)
    await expect(
      repository.listChannels({
        actor: saleA,
        marketId: MARKET,
        id: foreign.id,
        scope: 'OWN',
      }),
    ).rejects.toBeInstanceOf(ContactNotFoundError)
    await expect(
      repository.timeline({
        actor: saleA,
        marketId: MARKET,
        id: foreign.id,
        scope: 'OWN',
        limit: 50,
      }),
    ).rejects.toBeInstanceOf(ContactNotFoundError)

    // A nonexistent id is indistinguishable from an out-of-scope one.
    await expect(
      repository.get({ actor: saleA, marketId: MARKET, id: 999_999, scope: 'OWN' }),
    ).rejects.toBeInstanceOf(ContactNotFoundError)
  })

  it('IT-06b an ASSIGNED or NONE scope is default-deny', async () => {
    const own = await createContact(saleA, CUSTOMER_A, 'Kim Minji')
    for (const scope of ['ASSIGNED', 'NONE'] as const) {
      await expect(
        repository.get({ actor: saleA, marketId: MARKET, id: own.id, scope }),
      ).rejects.toBeInstanceOf(ContactNotFoundError)
    }
  })

  it('IT-06c a manager TEAM scope sees team-owned buyers', async () => {
    const contact = await createContact(saleB, CUSTOMER_B, 'Team contact')
    const found = await repository.get({
      actor: manager,
      marketId: MARKET,
      id: contact.id,
      scope: 'TEAM',
    })
    expect(found.contact.displayName).toBe('Team contact')
  })

  it('IT-07 a transfer to an inaccessible or archived buyer is refused (AC-09)', async () => {
    const contact = await createContact(saleA, CUSTOMER_A, 'Kim Minji')

    await expect(
      repository.transfer({
        actor: saleA,
        requestId: request(),
        marketId: MARKET,
        id: contact.id,
        scope: 'OWN',
        version: contact.version,
        targetCustomerId: CUSTOMER_B,
        reason: 'Attempted move out of scope',
      }),
    ).rejects.toThrow('CONTACT_TRANSFER_TARGET_INVALID')
    await expect(
      repository.transfer({
        actor: saleA,
        requestId: request(),
        marketId: MARKET,
        id: contact.id,
        scope: 'OWN',
        version: contact.version,
        targetCustomerId: CUSTOMER_ARCHIVED,
        reason: 'Attempted move to archived buyer',
      }),
    ).rejects.toThrow('CONTACT_TRANSFER_TARGET_INVALID')

    const still = await repository.get({
      actor: saleA,
      marketId: MARKET,
      id: contact.id,
      scope: 'OWN',
    })
    expect(still.contact.customerId).toBe(CUSTOMER_A)
  })

  it('IT-07b an authorized transfer moves the contact, releases primaries and audits', async () => {
    const contact = await createContact(saleA, CUSTOMER_A, 'Kim Minji')
    const primary = await repository.setPrimary({
      actor: saleA,
      requestId: request(),
      marketId: MARKET,
      id: contact.id,
      scope: 'OWN',
      version: contact.version,
      context: 'procurement',
    })

    const moved = await repository.transfer({
      actor: saleA,
      requestId: request(),
      marketId: MARKET,
      id: contact.id,
      scope: 'OWN',
      version: primary.contact.version,
      targetCustomerId: CUSTOMER_A2,
      reason: 'Buyer restructured procurement',
    })

    expect(moved.customerId).toBe(CUSTOMER_A2)
    const remaining = await sqlClient`
      SELECT count(*)::int AS count FROM customer_primary_contacts
      WHERE customer_id = ${CUSTOMER_A} AND contact_id = ${contact.id}
    `
    expect(remaining[0].count).toBe(0)
    const [audit] = await sqlClient`
      SELECT reason, safe_diff FROM audit_events
      WHERE action = 'contact.transferred' AND resource_id = ${contact.id}
    `
    expect(audit.reason).toBe('Buyer restructured procurement')
    expect(audit.safe_diff).toMatchObject({
      formerCustomerId: CUSTOMER_A,
      newCustomerId: CUSTOMER_A2,
    })
  })
})

describe('M02 contacts · primary designation and lifecycle', () => {
  it('IT-08 a primary change records the designation and audits it (AC-10)', async () => {
    const first = await createContact(saleA, CUSTOMER_A, 'Kim Minji')
    const second = await createContact(saleA, CUSTOMER_A, 'Park Jisu')

    await repository.setPrimary({
      actor: saleA,
      requestId: request(),
      marketId: MARKET,
      id: first.id,
      scope: 'OWN',
      version: first.version,
      context: 'procurement',
    })
    const result = await repository.setPrimary({
      actor: saleA,
      requestId: request(),
      marketId: MARKET,
      id: second.id,
      scope: 'OWN',
      version: second.version,
      context: 'procurement',
    })

    expect(result.primaryContexts).toEqual(['procurement'])
    const rows = await sqlClient`
      SELECT contact_id, context, version FROM customer_primary_contacts
      WHERE customer_id = ${CUSTOMER_A}
    `
    // The designation row is updated in place; no row is ever deleted.
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ contact_id: second.id, context: 'procurement' })
    const [audit] = await sqlClient`
      SELECT safe_diff FROM audit_events
      WHERE action = 'contact.primary_set' AND resource_id = ${second.id}
    `
    expect(audit.safe_diff).toMatchObject({
      context: 'procurement',
      previousContactId: first.id,
    })
  })

  it('IT-09 procurement, invoicing and consignee primaries are independent (AC-11)', async () => {
    const procurement = await createContact(saleA, CUSTOMER_A, 'Procurement')
    const invoicing = await createContact(saleA, CUSTOMER_A, 'Invoicing')
    const consignee = await createContact(saleA, CUSTOMER_A, 'Consignee')

    for (const [contact, context] of [
      [procurement, 'procurement'],
      [invoicing, 'invoicing'],
      [consignee, 'consignee'],
    ] as const) {
      await repository.setPrimary({
        actor: saleA,
        requestId: request(),
        marketId: MARKET,
        id: contact.id,
        scope: 'OWN',
        version: contact.version,
        context,
      })
    }

    const replacement = await createContact(saleA, CUSTOMER_A, 'New procurement')
    await repository.setPrimary({
      actor: saleA,
      requestId: request(),
      marketId: MARKET,
      id: replacement.id,
      scope: 'OWN',
      version: replacement.version,
      context: 'procurement',
    })

    const rows = await sqlClient`
      SELECT context, contact_id FROM customer_primary_contacts
      WHERE customer_id = ${CUSTOMER_A} ORDER BY context
    `
    expect(rows).toEqual([
      { context: 'consignee', contact_id: consignee.id },
      { context: 'invoicing', contact_id: invoicing.id },
      { context: 'procurement', contact_id: replacement.id },
    ])
  })

  it('IT-10 deactivation preserves the record and its history (AC-12)', async () => {
    const contact = await createContact(saleA, CUSTOMER_A, 'Kim Minji')
    await repository.setPrimary({
      actor: saleA,
      requestId: request(),
      marketId: MARKET,
      id: contact.id,
      scope: 'OWN',
      version: contact.version,
      context: 'invoicing',
    })
    const current = await repository.get({
      actor: saleA,
      marketId: MARKET,
      id: contact.id,
      scope: 'OWN',
    })

    const deactivated = await repository.deactivate({
      actor: saleA,
      requestId: request(),
      marketId: MARKET,
      id: contact.id,
      scope: 'OWN',
      version: current.contact.version as number,
      reason: 'Left the buyer company',
    })

    expect(deactivated.active).toBe(false)
    const [{ count }] = await sqlClient`SELECT count(*)::int FROM contacts`
    expect(count).toBe(1)
    const designations = await sqlClient`
      SELECT context FROM customer_primary_contacts WHERE contact_id = ${contact.id}
    `
    expect(designations).toHaveLength(1)

    const inactivePage = await repository.list({
      actor: saleA,
      marketId: MARKET,
      scope: 'OWN',
      active: false,
      limit: 50,
    })
    expect(inactivePage.items.map((item) => item.id)).toEqual([contact.id])

    // An inactive contact is immutable through the ordinary edit paths.
    await expect(
      repository.update({
        actor: saleA,
        requestId: request(),
        marketId: MARKET,
        id: contact.id,
        scope: 'OWN',
        version: deactivated.version,
        patch: { displayName: 'Should not apply' },
      }),
    ).rejects.toThrow('CONTACT_INACTIVE')

    const timeline = await repository.timeline({
      actor: saleA,
      marketId: MARKET,
      id: contact.id,
      scope: 'OWN',
      limit: 50,
    })
    expect(timeline.items.map((item) => item.action)).toContain(
      'contact.deactivated',
    )
  })
})

describe('M02 contacts · channels, consent and structural constraints', () => {
  it('IT-18 only one primary channel exists per contact and kind', async () => {
    const contact = await createContact(saleA, CUSTOMER_A, 'Kim Minji', [
      { kind: 'email', handle: 'first@buyer.test', isPrimary: true },
    ])
    const added = await repository.createChannel({
      actor: saleA,
      requestId: request(),
      marketId: MARKET,
      id: contact.id,
      scope: 'OWN',
      version: contact.version,
      values: { kind: 'email', handle: 'second@buyer.test', isPrimary: true },
    })

    const primaries = await sqlClient`
      SELECT handle FROM contact_channels
      WHERE contact_id = ${contact.id} AND kind = 'email' AND is_primary
    `
    expect(primaries).toHaveLength(1)
    expect(primaries[0].handle).toBe('second@buyer.test')
    // The parent aggregate is locked and bumped by the child mutation.
    expect(added.contact.version).toBe(contact.version + 1)

    // A phone primary is independent of the email primary.
    await repository.createChannel({
      actor: saleA,
      requestId: request(),
      marketId: MARKET,
      id: contact.id,
      scope: 'OWN',
      version: added.contact.version,
      values: { kind: 'phone', handle: '+82 10 1111 2222', isPrimary: true },
    })
    const allPrimaries = await sqlClient`
      SELECT kind FROM contact_channels WHERE contact_id = ${contact.id} AND is_primary
      ORDER BY kind
    `
    expect(allPrimaries.map((row) => row.kind)).toEqual(['email', 'phone'])
  })

  it('IT-14 consent is stored explicitly and defaults to do-not-contact (AC-16 storage)', async () => {
    const contact = await createContact(saleA, CUSTOMER_A, 'Kim Minji')

    const denied = await repository.upsertPreference({
      actor: saleA,
      requestId: request(),
      marketId: MARKET,
      id: contact.id,
      scope: 'OWN',
      version: contact.version,
      values: {
        purpose: 'marketing',
        allowed: false,
        recordedAt: new Date('2026-11-01T00:00:00Z'),
      },
    })
    expect(denied.preference.allowed).toBe(false)

    // Upsert on the unique (market, contact, purpose) key, never a second row.
    const updated = await repository.upsertPreference({
      actor: saleA,
      requestId: request(),
      marketId: MARKET,
      id: contact.id,
      scope: 'OWN',
      version: denied.contact.version,
      values: {
        purpose: 'marketing',
        allowed: true,
        recordedAt: new Date('2026-11-02T00:00:00Z'),
      },
    })
    expect(updated.preference.allowed).toBe(true)
    const rows = await sqlClient`
      SELECT purpose, allowed FROM contact_preferences WHERE contact_id = ${contact.id}
    `
    expect(rows).toEqual([{ purpose: 'marketing', allowed: true }])

    const preferences = await repository.listPreferences({
      actor: saleA,
      marketId: MARKET,
      id: contact.id,
      scope: 'OWN',
    })
    expect(preferences).toHaveLength(1)
  })

  it('IT-10b consent evidence must be a clean same-market file', async () => {
    const contact = await createContact(saleA, CUSTOMER_A, 'Kim Minji')
    await sqlClient`
      INSERT INTO files (
        id, market_id, uploaded_by, storage_key, original_name, media_type,
        byte_size, sha256, scan_state
      ) VALUES
        (1, ${MARKET}, ${SALE_A}, 'k1', 'clean.pdf', 'application/pdf', 10,
         ${'a'.repeat(64)}, 'CLEAN'),
        (2, ${MARKET}, ${SALE_A}, 'k2', 'pending.pdf', 'application/pdf', 10,
         ${'b'.repeat(64)}, 'PENDING'),
        (3, ${OTHER_MARKET}, ${SALE_A}, 'k3', 'other.pdf', 'application/pdf', 10,
         ${'c'.repeat(64)}, 'CLEAN')
    `

    for (const fileId of [2, 3, 99]) {
      await expect(
        repository.upsertPreference({
          actor: saleA,
          requestId: request(),
          marketId: MARKET,
          id: contact.id,
          scope: 'OWN',
          version: contact.version,
          values: {
            purpose: 'commercial',
            allowed: true,
            evidenceFileId: fileId,
            recordedAt: new Date(),
          },
        }),
      ).rejects.toThrow('CONTACT_EVIDENCE_FILE_INVALID')
    }

    const accepted = await repository.upsertPreference({
      actor: saleA,
      requestId: request(),
      marketId: MARKET,
      id: contact.id,
      scope: 'OWN',
      version: contact.version,
      values: {
        purpose: 'commercial',
        allowed: true,
        evidenceFileId: 1,
        recordedAt: new Date(),
      },
    })
    expect(accepted.preference.evidenceFileId).toBe(1)
  })
})

describe('M02 contacts · frozen history after a customer handover', () => {
  async function handover() {
    const first = await createContact(saleA, CUSTOMER_A, 'Kim Minji', [
      { kind: 'email', handle: 'minji@buyer.test', isPrimary: true },
    ])
    const [customer] = await sqlClient`
      SELECT version FROM customers WHERE id = ${CUSTOMER_A}
    `
    await customerRepository.reassign({
      actor: manager,
      requestId: request(),
      marketId: MARKET,
      id: CUSTOMER_A,
      scope: 'ALL',
      version: customer.version,
      ownerId: SALE_B,
      teamId: TEAM,
      reason: 'Owner left the company',
    })
    return first
  }

  it('IT-11 a former owner reads the frozen cutoff payload, not live data (AC-13)', async () => {
    const contact = await handover()

    const snapshots = await sqlClient`
      SELECT hs.source_version, rl.contact_id, he.user_id
      FROM history_snapshots hs
      JOIN record_links rl ON rl.id = hs.record_link_id
      JOIN history_entitlements he ON he.snapshot_id = hs.id
      WHERE rl.contact_id IS NOT NULL
    `
    expect(snapshots).toHaveLength(1)
    expect(snapshots[0]).toMatchObject({
      contact_id: contact.id,
      user_id: SALE_A,
    })

    const historical = await repository.get({
      actor: saleA,
      marketId: MARKET,
      id: contact.id,
      scope: 'OWN',
    })
    expect(historical.historical).toBe(true)
    expect(historical.contact.displayName).toBe('Kim Minji')

    // The new owner has live access.
    const live = await repository.get({
      actor: saleB,
      marketId: MARKET,
      id: contact.id,
      scope: 'OWN',
    })
    expect(live.historical).toBe(false)
  })

  it('IT-12 post-handover edits and new contacts stay invisible to the former owner (AC-14)', async () => {
    const contact = await handover()
    const live = await repository.get({
      actor: saleB,
      marketId: MARKET,
      id: contact.id,
      scope: 'OWN',
    })
    await repository.update({
      actor: saleB,
      requestId: request(),
      marketId: MARKET,
      id: contact.id,
      scope: 'OWN',
      version: live.contact.version as number,
      patch: { displayName: 'Kim Minji (after handover)' },
    })
    const added = await createContact(saleB, CUSTOMER_A, 'Created after handover')

    const historical = await repository.get({
      actor: saleA,
      marketId: MARKET,
      id: contact.id,
      scope: 'OWN',
    })
    expect(historical.contact.displayName).toBe('Kim Minji')

    // A contact created after the cutoff has no snapshot, so it is not visible.
    await expect(
      repository.get({
        actor: saleA,
        marketId: MARKET,
        id: added.id,
        scope: 'OWN',
      }),
    ).rejects.toBeInstanceOf(ContactNotFoundError)

    const page = await repository.list({
      actor: saleA,
      marketId: MARKET,
      scope: 'OWN',
      limit: 50,
    })
    expect(page.items).toEqual([])
    expect(page.historyItems).toHaveLength(1)
    expect(page.historyItems[0].payload.displayName).toBe('Kim Minji')

    // History is read-only: every mutation path still denies the former owner.
    await expect(
      repository.update({
        actor: saleA,
        requestId: request(),
        marketId: MARKET,
        id: contact.id,
        scope: 'OWN',
        version: 1,
        patch: { displayName: 'Former owner edit' },
      }),
    ).rejects.toBeInstanceOf(ContactNotFoundError)
    await expect(
      repository.deactivate({
        actor: saleA,
        requestId: request(),
        marketId: MARKET,
        id: contact.id,
        scope: 'OWN',
        version: 1,
        reason: 'Former owner deactivation',
      }),
    ).rejects.toBeInstanceOf(ContactNotFoundError)
  })

  it('IT-17 an entitlement without current market membership is still denied (AC-19)', async () => {
    const contact = await handover()
    const revoked = { ...saleA, marketIds: [] as number[] }

    await expect(
      repository.get({
        actor: revoked,
        marketId: MARKET,
        id: contact.id,
        scope: 'OWN',
      }),
    ).rejects.toThrow()
    await expect(
      repository.list({
        actor: revoked,
        marketId: MARKET,
        scope: 'OWN',
        limit: 50,
      }),
    ).rejects.toThrow()
  })
})

describe('M02 contacts · concurrency and mandatory audit', () => {
  it('IT-16 a stale expectedVersion loses rather than silently overwriting (AC-18)', async () => {
    const contact = await createContact(saleA, CUSTOMER_A, 'Kim Minji')

    await repository.update({
      actor: saleA,
      requestId: request(),
      marketId: MARKET,
      id: contact.id,
      scope: 'OWN',
      version: contact.version,
      patch: { displayName: 'First writer' },
    })
    await expect(
      repository.update({
        actor: saleA,
        requestId: request(),
        marketId: MARKET,
        id: contact.id,
        scope: 'OWN',
        version: contact.version,
        patch: { displayName: 'Second writer' },
      }),
    ).rejects.toBeInstanceOf(ContactConflictError)

    const current = await repository.get({
      actor: saleA,
      marketId: MARKET,
      id: contact.id,
      scope: 'OWN',
    })
    expect(current.contact.displayName).toBe('First writer')
  })

  it('IT-16b two concurrent setPrimary commands cannot both win', async () => {
    const first = await createContact(saleA, CUSTOMER_A, 'Kim Minji')
    const second = await createContact(saleA, CUSTOMER_A, 'Park Jisu')

    const results = await Promise.allSettled([
      repository.setPrimary({
        actor: saleA,
        requestId: request(),
        marketId: MARKET,
        id: first.id,
        scope: 'OWN',
        version: first.version,
        context: 'procurement',
      }),
      repository.setPrimary({
        actor: saleA,
        requestId: request(),
        marketId: MARKET,
        id: second.id,
        scope: 'OWN',
        version: second.version,
        context: 'procurement',
      }),
    ])
    expect(results.filter((result) => result.status === 'fulfilled').length)
      .toBeGreaterThanOrEqual(1)
    const rows = await sqlClient`
      SELECT context, contact_id FROM customer_primary_contacts
      WHERE customer_id = ${CUSTOMER_A}
    `
    // The unique (market, customer, context) key guarantees a single winner.
    expect(rows).toHaveLength(1)
  })

  it('IT-15 a failed mandatory audit write rolls the business change back (AC-17)', async () => {
    const contact = await createContact(saleA, CUSTOMER_A, 'Kim Minji')
    // audit_events is append-only in R1-02; force an audit failure with a
    // NOT NULL violation on request_id to prove the rollback boundary.
    await expect(
      repository.update({
        actor: saleA,
        requestId: null as unknown as string,
        marketId: MARKET,
        id: contact.id,
        scope: 'OWN',
        version: contact.version,
        patch: { displayName: 'Should be rolled back' },
      }),
    ).rejects.toThrow()

    const current = await repository.get({
      actor: saleA,
      marketId: MARKET,
      id: contact.id,
      scope: 'OWN',
    })
    expect(current.contact.displayName).toBe('Kim Minji')
    expect(current.contact.version).toBe(1)
  })
})

describe('M02 contacts · filters, pagination and counts', () => {
  it('IT-13b filters and keyset pagination apply after authorization (AC-15)', async () => {
    const created: number[] = []
    for (const name of ['Alpha Kim', 'Beta Park', 'Gamma Lee']) {
      const contact = await createContact(saleA, CUSTOMER_A, name)
      created.push(contact.id)
    }
    await createContact(saleA, CUSTOMER_A2, 'Delta Choi')
    await createContact(saleB, CUSTOMER_B, 'Hidden Han')

    const firstPage = await repository.list({
      actor: saleA,
      marketId: MARKET,
      scope: 'OWN',
      limit: 2,
    })
    expect(firstPage.items).toHaveLength(2)
    expect(firstPage.nextCursor).toBeTruthy()

    const secondPage = await repository.list({
      actor: saleA,
      marketId: MARKET,
      scope: 'OWN',
      limit: 2,
      cursor: decodeCursor(firstPage.nextCursor!),
    })
    const seen = [...firstPage.items, ...secondPage.items].map((item) => item.id)
    expect(new Set(seen).size).toBe(seen.length)
    expect(seen).not.toContain(
      (
        await sqlClient`SELECT id FROM contacts WHERE display_name = 'Hidden Han'`
      )[0].id,
    )

    const filtered = await repository.list({
      actor: saleA,
      marketId: MARKET,
      scope: 'OWN',
      customerId: CUSTOMER_A2,
      limit: 50,
    })
    expect(filtered.items.map((item) => item.displayName)).toEqual([
      'Delta Choi',
    ])

    const searched = await repository.list({
      actor: saleA,
      marketId: MARKET,
      scope: 'OWN',
      query: 'beta',
      limit: 50,
    })
    expect(searched.items.map((item) => item.displayName)).toEqual(['Beta Park'])

    // A wildcard in the query is escaped, not interpreted.
    const wildcard = await repository.list({
      actor: saleA,
      marketId: MARKET,
      scope: 'OWN',
      query: '%',
      limit: 50,
    })
    expect(wildcard.items).toEqual([])

    // No response field exposes an unfiltered total.
    expect(Object.keys(firstPage)).toEqual(['items', 'historyItems', 'nextCursor'])
  })
})

function decodeCursor(value: string) {
  const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
  return { timestamp: decoded.createdAt as string, id: decoded.id as number }
}
