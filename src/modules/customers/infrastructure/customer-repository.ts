import 'server-only'
import {
  and,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNull,
  lte,
  lt,
  or,
  sql,
  type SQL,
} from 'drizzle-orm'
import {
  AccessDeniedError,
  type Principal,
  type RecordScope,
} from '@/modules/access-control/domain/types'
import { getDatabase } from '@/modules/access-control/infrastructure/database'
import {
  auditEvents,
  customerAddresses,
  customerIdentifiers,
  customerTransfers,
  customers,
  historyEntitlements,
  historySnapshots,
  markets,
  recordLinks,
  teamMemberships,
  teams,
  userMarketMemberships,
  users,
} from '@/modules/access-control/infrastructure/schema'
import {
  canTransitionCustomer,
  normalizeIdentifier,
} from '../application/contracts'

export class CustomerConflictError extends Error {
  constructor(message = 'Customer changed; reload and retry') {
    super(message)
    this.name = 'CustomerConflictError'
  }
}

export class CustomerNotFoundError extends Error {
  constructor() {
    super('Customer not found')
    this.name = 'CustomerNotFoundError'
  }
}

function scopeCondition(scope: RecordScope, actor: Principal): SQL {
  if (scope === 'ALL') return sql`true`
  if (scope === 'OWN') return eq(customers.ownerId, actor.userId)
  if (scope === 'TEAM' && actor.teamIds.length)
    return inArray(customers.teamId, actor.teamIds)
  return sql`false`
}

function safeSearch(value: string) {
  return `%${value.replace(/[\\%_]/g, '\\$&')}%`
}

export class CustomerRepository {
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
    if (!market || !actor.marketIds.includes(market.id))
      throw new AccessDeniedError()
    return market.id
  }

  async listMarkets(actor: Principal) {
    if (!actor.marketIds.length) return []
    return this.database
      .select({
        id: markets.id,
        code: markets.code,
        nameEn: markets.nameEn,
        nameVi: markets.nameVi,
        defaultCurrency: markets.defaultCurrency,
      })
      .from(markets)
      .where(and(inArray(markets.id, actor.marketIds), eq(markets.active, true)))
      .orderBy(markets.code)
  }

  async list(input: {
    actor: Principal
    marketId: number
    scope: RecordScope
    query?: string
    country?: string
    status?: string
    ownerId?: number
    limit: number
    cursor?: { createdAt: string; id: number }
  }) {
    this.assertMarketAccess(input.actor, input.marketId)
    const conditions: SQL[] = [
      eq(customers.marketId, input.marketId),
      scopeCondition(input.scope, input.actor),
    ]
    if (input.query) {
      const pattern = safeSearch(input.query)
      conditions.push(
        or(
          ilike(customers.legalName, pattern),
          ilike(customers.tradeName, pattern),
          ilike(customers.code, pattern),
        )!,
      )
    }
    if (input.country) conditions.push(eq(customers.countryCode, input.country))
    if (input.status) conditions.push(eq(customers.status, input.status))
    if (input.ownerId) conditions.push(eq(customers.ownerId, input.ownerId))
    if (input.cursor) {
      const createdAt = new Date(input.cursor.createdAt)
      conditions.push(
        or(
          lt(customers.createdAt, createdAt),
          and(
            eq(customers.createdAt, createdAt),
            lt(customers.id, input.cursor.id),
          ),
        )!,
      )
    }
    const rows = await this.database
      .select()
      .from(customers)
      .where(and(...conditions))
      .orderBy(desc(customers.createdAt), desc(customers.id))
      .limit(input.limit + 1)
    const hasMore = rows.length > input.limit
    const items = hasMore ? rows.slice(0, input.limit) : rows
    const last = items.at(-1)
    const historical = await this.listHistorical(
      input.actor,
      input.marketId,
      input.query,
      input.limit,
      input.country,
      input.status,
      input.ownerId,
    )
    return {
      items,
      historyItems: historical,
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

  async get(input: {
    actor: Principal
    marketId: number
    id: number
    scope: RecordScope
  }) {
    this.assertMarketAccess(input.actor, input.marketId)
    const [customer] = await this.database
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, input.id),
          eq(customers.marketId, input.marketId),
          scopeCondition(input.scope, input.actor),
        ),
      )
      .limit(1)
    if (customer) {
      const [addresses, identifiers] = await Promise.all([
        this.database
          .select()
          .from(customerAddresses)
          .where(
            and(
              eq(customerAddresses.marketId, input.marketId),
              eq(customerAddresses.customerId, input.id),
            ),
          ),
        this.database
          .select()
          .from(customerIdentifiers)
          .where(
            and(
              eq(customerIdentifiers.marketId, input.marketId),
              eq(customerIdentifiers.customerId, input.id),
            ),
          ),
      ])
      const history = await this.getCurrentHistory(input.marketId, input.id)
      return { customer, addresses, identifiers, history, historical: false }
    }
    const history = await this.getEntitledHistory(
      input.actor.userId,
      input.marketId,
      input.id,
    )
    const latest = history[0]
    return latest
      ? {
          customer: latest.payload,
          addresses: (latest.payload.addresses as Array<Record<string, unknown>>) ?? [],
          identifiers: (latest.payload.identifiers as Array<Record<string, unknown>>) ?? [],
          history,
          historical: true,
        }
      : null
  }

  async create(input: {
    actor: Principal
    requestId: string
    values: Record<string, unknown> & {
      marketId: number
      code: string
      legalName: string
      countryCode: string
      ownerId: number
      teamId: number | null
      addresses: Array<Record<string, unknown>>
      identifiers: Array<Record<string, unknown>>
      status: string
    }
  }) {
    this.assertMarketAccess(input.actor, input.values.marketId)
    await this.assertOwnerAssignment(
      input.values.marketId,
      input.values.ownerId,
      input.values.teamId,
    )
    return this.database.transaction(async (transaction) => {
      const [customer] = await transaction
        .insert(customers)
        .values({
          marketId: input.values.marketId,
          code: input.values.code,
          legalName: input.values.legalName,
          tradeName: (input.values.tradeName as string | null) ?? null,
          countryCode: input.values.countryCode,
          preferredLanguage:
            (input.values.preferredLanguage as string | null) ?? null,
          preferredCurrency:
            (input.values.preferredCurrency as string | null) ?? null,
          website: (input.values.website as string | null) ?? null,
          status: input.values.status,
          ownerId: input.values.ownerId,
          teamId: input.values.teamId,
        })
        .returning()
      await this.insertChildRows(
        transaction,
        customer,
        input.values.addresses,
        input.values.identifiers,
      )
      await transaction.insert(recordLinks).values({
        marketId: customer.marketId,
        customerId: customer.id,
      })
      await transaction.insert(auditEvents).values({
        marketId: customer.marketId,
        actorId: input.actor.userId,
        action: 'customer.created',
        resourceType: 'customer',
        resourceId: customer.id,
        resourceVersion: customer.version,
        requestId: input.requestId,
        safeDiff: { customerStatus: customer.status },
        result: 'SUCCESS',
      })
      return customer
    })
  }

  async update(input: {
    actor: Principal
    requestId: string
    marketId: number
    id: number
    scope: RecordScope
    version: number
    patch: Record<string, unknown>
  }) {
    this.assertMarketAccess(input.actor, input.marketId)
    return this.database.transaction(async (transaction) => {
      const [current] = await transaction
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.id, input.id),
            eq(customers.marketId, input.marketId),
            scopeCondition(input.scope, input.actor),
          ),
        )
        .for('update')
        .limit(1)
      if (!current) throw new CustomerNotFoundError()
      if (current.status === 'ARCHIVED')
        throw new Error('INVALID_CUSTOMER_TRANSITION')
      if (current.version !== input.version)
        throw new CustomerConflictError()
      const { addresses, identifiers, status, ...fields } = input.patch
      if (
        typeof status === 'string' &&
        !['PROSPECT', 'ACTIVE', 'ON_HOLD', 'INACTIVE', 'ARCHIVED'].includes(
          status,
        )
      ) {
        throw new Error('INVALID_CUSTOMER_STATUS')
      }
      if (
        typeof status === 'string' &&
        !canTransitionCustomer(current.status, status)
      ) {
        throw new Error('INVALID_CUSTOMER_TRANSITION')
      }
      const [updated] = await transaction
        .update(customers)
        .set({
          ...(fields as Partial<typeof current>),
          ...(typeof status === 'string' ? { status } : {}),
          updatedAt: new Date(),
          version: sql`${customers.version} + 1`,
        })
        .where(
          and(
            eq(customers.id, input.id),
            eq(customers.marketId, input.marketId),
            eq(customers.version, input.version),
          ),
        )
        .returning()
      if (!updated) throw new CustomerConflictError()
      if (Array.isArray(addresses) || Array.isArray(identifiers)) {
        await this.upsertChildRows(
          transaction,
          updated,
          (addresses as Array<Record<string, unknown>> | undefined) ?? [],
          (identifiers as Array<Record<string, unknown>> | undefined) ?? [],
        )
      }
      await transaction.insert(auditEvents).values({
        marketId: updated.marketId,
        actorId: input.actor.userId,
        action: 'customer.updated',
        resourceType: 'customer',
        resourceId: updated.id,
        resourceVersion: updated.version,
        requestId: input.requestId,
        safeDiff: {
          ...(status ? { customerStatus: status } : {}),
          changedFields: Object.keys(input.patch).filter(
            (key) => key !== 'website',
          ),
        },
        result: 'SUCCESS',
      })
      return updated
    })
  }

  async reassign(input: {
    actor: Principal
    requestId: string
    marketId: number
    id: number
    scope: RecordScope
    version: number
    ownerId: number
    teamId: number | null
    reason: string
  }) {
    this.assertMarketAccess(input.actor, input.marketId)
    return this.database.transaction(async (transaction) => {
      const [current] = await transaction
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.id, input.id),
            eq(customers.marketId, input.marketId),
            scopeCondition(input.scope, input.actor),
          ),
        )
        .for('update')
        .limit(1)
      if (!current) throw new CustomerNotFoundError()
      if (current.version !== input.version)
        throw new CustomerConflictError()
      if (current.status === 'ARCHIVED')
        throw new Error('INVALID_CUSTOMER_TRANSITION')
      if (current.ownerId === input.ownerId)
        throw new Error('CUSTOMER_OWNER_UNCHANGED')
      await this.assertOwnerAssignment(
        input.marketId,
        input.ownerId,
        input.teamId,
      )
      const [addresses, identifiers] = await Promise.all([
        transaction
          .select()
          .from(customerAddresses)
          .where(
            and(
              eq(customerAddresses.marketId, input.marketId),
              eq(customerAddresses.customerId, input.id),
            ),
          ),
        transaction
          .select()
          .from(customerIdentifiers)
          .where(
            and(
              eq(customerIdentifiers.marketId, input.marketId),
              eq(customerIdentifiers.customerId, input.id),
            ),
          ),
      ])
      const transferredAt = new Date()
      const [link] = await transaction
        .insert(recordLinks)
        .values({ marketId: input.marketId, customerId: input.id })
        .returning({ id: recordLinks.id })
      const [transfer] = await transaction
        .insert(customerTransfers)
        .values({
          marketId: input.marketId,
          customerId: input.id,
          transferredAt,
          reason: input.reason,
          formerOwnerId: current.ownerId,
          newOwnerId: input.ownerId,
          authorizedBy: input.actor.userId,
        })
        .returning({ id: customerTransfers.id })
      const payload = {
        id: current.id,
        marketId: current.marketId,
        code: current.code,
        legalName: current.legalName,
        tradeName: current.tradeName,
        countryCode: current.countryCode,
        preferredLanguage: current.preferredLanguage,
        preferredCurrency: current.preferredCurrency,
        website: current.website,
        status: current.status,
        ownerId: current.ownerId,
        teamId: current.teamId,
        version: current.version,
        addresses,
        identifiers,
      }
      const [snapshot] = await transaction
        .insert(historySnapshots)
        .values({
          marketId: input.marketId,
          transferId: transfer.id,
          recordLinkId: link.id,
          sourceVersion: current.version,
          payload,
        })
        .returning({ id: historySnapshots.id })
      await transaction.insert(historyEntitlements).values({
        marketId: input.marketId,
        snapshotId: snapshot.id,
        userId: current.ownerId,
      })
      const [updated] = await transaction
        .update(customers)
        .set({
          ownerId: input.ownerId,
          teamId: input.teamId,
          updatedAt: transferredAt,
          version: sql`${customers.version} + 1`,
        })
        .where(
          and(
            eq(customers.id, input.id),
            eq(customers.marketId, input.marketId),
            eq(customers.version, input.version),
          ),
        )
        .returning()
      if (!updated) throw new CustomerConflictError()
      await transaction.insert(auditEvents).values({
        marketId: input.marketId,
        actorId: input.actor.userId,
        action: 'customer.owner_reassigned',
        resourceType: 'customer',
        resourceId: updated.id,
        resourceVersion: updated.version,
        requestId: input.requestId,
        reason: input.reason,
        safeDiff: { ownerId: input.ownerId, teamId: input.teamId },
        result: 'SUCCESS',
      })
      return updated
    })
  }

  async archive(input: {
    actor: Principal
    requestId: string
    marketId: number
    id: number
    scope: RecordScope
    version: number
    reason: string
  }) {
    this.assertMarketAccess(input.actor, input.marketId)
    return this.database.transaction(async (transaction) => {
      const [current] = await transaction
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.id, input.id),
            eq(customers.marketId, input.marketId),
            scopeCondition(input.scope, input.actor),
          ),
        )
        .for('update')
        .limit(1)
      if (!current) throw new CustomerNotFoundError()
      if (current.version !== input.version) throw new CustomerConflictError()
      if (current.status === 'ARCHIVED') return current
      const now = new Date()
      const [updated] = await transaction
        .update(customers)
        .set({
          status: 'ARCHIVED',
          updatedAt: now,
          version: sql`${customers.version} + 1`,
        })
        .where(
          and(
            eq(customers.id, input.id),
            eq(customers.marketId, input.marketId),
            eq(customers.version, input.version),
          ),
        )
        .returning()
      if (!updated) throw new CustomerConflictError()
      await transaction.insert(auditEvents).values({
        marketId: input.marketId,
        actorId: input.actor.userId,
        action: 'customer.archived',
        resourceType: 'customer',
        resourceId: updated.id,
        resourceVersion: updated.version,
        requestId: input.requestId,
        reason: input.reason,
        safeDiff: { customerStatus: 'ARCHIVED' },
        result: 'SUCCESS',
      })
      return updated
    })
  }

  async duplicateCandidates(input: {
    actor: Principal
    marketId: number
    customerId?: number
    scope: RecordScope
    identifiers: Array<{ kind: string; value: string }>
  }) {
    this.assertMarketAccess(input.actor, input.marketId)
    if (!input.identifiers.length) return []
    const predicates = input.identifiers.map(({ kind, value }) =>
      and(
        eq(customerIdentifiers.kind, kind),
        eq(customerIdentifiers.normalizedValue, normalizeIdentifier(value)),
      ),
    )
    const conditions: SQL[] = [
      eq(customerIdentifiers.marketId, input.marketId),
      eq(customers.marketId, input.marketId),
      scopeCondition(input.scope, input.actor),
      or(...predicates)!,
    ]
    if (input.customerId)
      conditions.push(sql`${customers.id} <> ${input.customerId}`)
    return this.database
      .select({
        id: customers.id,
        code: customers.code,
        legalName: customers.legalName,
        tradeName: customers.tradeName,
        countryCode: customers.countryCode,
        status: customers.status,
        matchedKind: customerIdentifiers.kind,
      })
      .from(customerIdentifiers)
      .innerJoin(
        customers,
        and(
          eq(customers.id, customerIdentifiers.customerId),
          eq(customers.marketId, customerIdentifiers.marketId),
        ),
      )
      .where(and(...conditions))
      .groupBy(
        customers.id,
        customers.code,
        customers.legalName,
        customers.tradeName,
        customers.countryCode,
        customers.status,
        customerIdentifiers.kind,
      )
      .limit(25)
  }

  private async listHistorical(
    actor: Principal,
    marketId: number,
    query: string | undefined,
    limit: number,
    country?: string,
    status?: string,
    ownerId?: number,
  ) {
    const conditions: SQL[] = [
      eq(historyEntitlements.userId, actor.userId),
      eq(historyEntitlements.marketId, marketId),
      eq(historySnapshots.marketId, marketId),
      eq(recordLinks.marketId, marketId),
    ]
    if (query) {
      const pattern = safeSearch(query)
      conditions.push(
        or(
          sql`${historySnapshots.payload}->>'legalName' ILIKE ${pattern}`,
          sql`${historySnapshots.payload}->>'tradeName' ILIKE ${pattern}`,
          sql`${historySnapshots.payload}->>'code' ILIKE ${pattern}`,
        )!,
      )
    }
    if (country)
      conditions.push(sql`${historySnapshots.payload}->>'countryCode' = ${country}`)
    if (status)
      conditions.push(sql`${historySnapshots.payload}->>'status' = ${status}`)
    if (ownerId)
      conditions.push(sql`${historySnapshots.payload}->>'ownerId' = ${String(ownerId)}`)
    return this.database
      .select({
        customerId: recordLinks.customerId,
        transferredAt: customerTransfers.transferredAt,
        payload: historySnapshots.payload,
      })
      .from(historyEntitlements)
      .innerJoin(
        historySnapshots,
        eq(historySnapshots.id, historyEntitlements.snapshotId),
      )
      .innerJoin(
        recordLinks,
        eq(recordLinks.id, historySnapshots.recordLinkId),
      )
      .innerJoin(
        customerTransfers,
        eq(customerTransfers.id, historySnapshots.transferId),
      )
      .where(and(...conditions))
      .orderBy(desc(customerTransfers.transferredAt), desc(historySnapshots.id))
      .limit(limit)
  }

  private async getCurrentHistory(marketId: number, customerId: number) {
    const rows = await this.database
      .select({
        payload: historySnapshots.payload,
        transferredAt: customerTransfers.transferredAt,
      })
      .from(historySnapshots)
      .innerJoin(
        recordLinks,
        eq(recordLinks.id, historySnapshots.recordLinkId),
      )
      .innerJoin(
        customerTransfers,
        eq(customerTransfers.id, historySnapshots.transferId),
      )
      .where(
        and(
          eq(historySnapshots.marketId, marketId),
          eq(recordLinks.marketId, marketId),
          eq(recordLinks.customerId, customerId),
        ),
      )
      .orderBy(desc(historySnapshots.createdAt), desc(historySnapshots.id))
    return rows.map((row) => ({
      payload: row.payload as Record<string, unknown>,
      transferredAt: row.transferredAt,
    }))
  }

  private async getEntitledHistory(
    userId: number,
    marketId: number,
    customerId: number,
  ) {
    const rows = await this.database
      .select({
        payload: historySnapshots.payload,
        transferredAt: customerTransfers.transferredAt,
      })
      .from(historyEntitlements)
      .innerJoin(
        historySnapshots,
        eq(historySnapshots.id, historyEntitlements.snapshotId),
      )
      .innerJoin(
        recordLinks,
        eq(recordLinks.id, historySnapshots.recordLinkId),
      )
      .innerJoin(
        customerTransfers,
        eq(customerTransfers.id, historySnapshots.transferId),
      )
      .where(
        and(
          eq(historyEntitlements.userId, userId),
          eq(historyEntitlements.marketId, marketId),
          eq(historySnapshots.marketId, marketId),
          eq(recordLinks.marketId, marketId),
          eq(recordLinks.customerId, customerId),
        ),
      )
      .orderBy(desc(historySnapshots.createdAt), desc(historySnapshots.id))
    return rows.map((row) => ({
      payload: row.payload as Record<string, unknown>,
      transferredAt: row.transferredAt,
    }))
  }

  private async assertOwnerAssignment(
    marketId: number,
    ownerId: number,
    teamId: number | null,
  ) {
    const [owner] = await this.database
      .select({ id: users.id })
      .from(users)
      .innerJoin(
        userMarketMemberships,
        and(
          eq(userMarketMemberships.userId, users.id),
          eq(userMarketMemberships.marketId, marketId),
          eq(userMarketMemberships.active, true),
          isNull(userMarketMemberships.revokedAt),
        ),
      )
      .where(and(eq(users.id, ownerId), eq(users.status, 'ACTIVE')))
      .limit(1)
    if (!owner) throw new Error('CUSTOMER_OWNER_NOT_ACTIVE_IN_MARKET')
    if (teamId == null) return
    const [team] = await this.database
      .select({ id: teams.id })
      .from(teams)
      .innerJoin(
        teamMemberships,
        and(
          eq(teamMemberships.teamId, teams.id),
          eq(teamMemberships.userId, ownerId),
          lte(teamMemberships.startsAt, new Date()),
          or(isNull(teamMemberships.endsAt), gt(teamMemberships.endsAt, new Date())),
        ),
      )
        .where(and(eq(teams.id, teamId), eq(teams.active, true)))
      .limit(1)
    if (!team) throw new Error('CUSTOMER_TEAM_ASSIGNMENT_INVALID')
  }

  private async insertChildRows(
    transaction: Parameters<Parameters<typeof this.database.transaction>[0]>[0],
    customer: typeof customers.$inferSelect,
    addresses: Array<Record<string, unknown>>,
    identifiers: Array<Record<string, unknown>>,
  ) {
    for (const address of addresses) {
      await transaction.insert(customerAddresses).values({
        marketId: customer.marketId,
        customerId: customer.id,
        kind: String(address.kind),
        addressLines: String(address.addressLines),
        city: (address.city as string | null) ?? null,
        region: (address.region as string | null) ?? null,
        postalCode: (address.postalCode as string | null) ?? null,
        countryCode: String(address.countryCode),
        isDefault: Boolean(address.isDefault),
      })
    }
    for (const identifier of identifiers) {
      await transaction.insert(customerIdentifiers).values({
        marketId: customer.marketId,
        customerId: customer.id,
        kind: String(identifier.kind),
        value: String(identifier.value),
        normalizedValue: normalizeIdentifier(String(identifier.value)),
        issuingCountry: (identifier.issuingCountry as string | null) ?? null,
      })
    }
  }

  private async upsertChildRows(
    transaction: Parameters<Parameters<typeof this.database.transaction>[0]>[0],
    customer: typeof customers.$inferSelect,
    addresses: Array<Record<string, unknown>>,
    identifiers: Array<Record<string, unknown>>,
  ) {
    for (const address of addresses) {
      const values = {
        kind: String(address.kind),
        addressLines: String(address.addressLines),
        city: (address.city as string | null) ?? null,
        region: (address.region as string | null) ?? null,
        postalCode: (address.postalCode as string | null) ?? null,
        countryCode: String(address.countryCode),
        isDefault: Boolean(address.isDefault),
        updatedAt: new Date(),
      }
      if (typeof address.id === 'number') {
        const [updated] = await transaction
          .update(customerAddresses)
          .set({ ...values, version: sql`${customerAddresses.version} + 1` })
          .where(
            and(
              eq(customerAddresses.id, address.id),
              eq(customerAddresses.marketId, customer.marketId),
              eq(customerAddresses.customerId, customer.id),
            ),
          )
          .returning({ id: customerAddresses.id })
        if (!updated) throw new CustomerNotFoundError()
      } else {
        await transaction.insert(customerAddresses).values({
          ...values,
          marketId: customer.marketId,
          customerId: customer.id,
        })
      }
    }
    for (const identifier of identifiers) {
      const value = String(identifier.value)
      const values = {
        kind: String(identifier.kind),
        value,
        normalizedValue: normalizeIdentifier(value),
        issuingCountry: (identifier.issuingCountry as string | null) ?? null,
        updatedAt: new Date(),
      }
      if (typeof identifier.id === 'number') {
        const [updated] = await transaction
          .update(customerIdentifiers)
          .set({ ...values, version: sql`${customerIdentifiers.version} + 1` })
          .where(
            and(
              eq(customerIdentifiers.id, identifier.id),
              eq(customerIdentifiers.marketId, customer.marketId),
              eq(customerIdentifiers.customerId, customer.id),
            ),
          )
          .returning({ id: customerIdentifiers.id })
        if (!updated) throw new CustomerNotFoundError()
      } else {
        await transaction.insert(customerIdentifiers).values({
          ...values,
          marketId: customer.marketId,
          customerId: customer.id,
        })
      }
    }
  }
}
