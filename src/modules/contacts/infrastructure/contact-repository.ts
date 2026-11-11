import 'server-only'
import {
  and,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  lt,
  ne,
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
  contactChannels,
  contactPreferences,
  contacts,
  customerPrimaryContacts,
  customerTransfers,
  customers,
  files,
  historyEntitlements,
  historySnapshots,
  markets,
  recordLinks,
} from '@/modules/access-control/infrastructure/schema'
import { projectSafeAuditDiff } from '@/modules/access-control/application/audit-safe-diff'
import {
  encodeContactCursor,
  normalizeChannelHandle,
} from '../application/contracts'

type Transaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>['transaction']>[0]
>[0]

export class ContactConflictError extends Error {
  constructor(message = 'Contact changed; reload and retry') {
    super(message)
    this.name = 'ContactConflictError'
  }
}

export class ContactNotFoundError extends Error {
  constructor() {
    super('Contact not found')
    this.name = 'ContactNotFoundError'
  }
}

/**
 * Contacts carry no `owner_id`/`team_id`: record scope is always derived from
 * the parent customer inside the same statement. `NONE` and `ASSIGNED` are
 * default-deny because R1 has no contact assignment model.
 */
function parentScope(scope: RecordScope, actor: Principal): SQL {
  if (scope === 'ALL') return sql`true`
  if (scope === 'OWN') return eq(customers.ownerId, actor.userId)
  if (scope === 'TEAM' && actor.teamIds.length)
    return inArray(customers.teamId, actor.teamIds)
  return sql`false`
}

function safeSearch(value: string) {
  return `%${value.replace(/[\\%_]/g, '\\$&')}%`
}

const contactColumns = {
  id: contacts.id,
  marketId: contacts.marketId,
  customerId: contacts.customerId,
  displayName: contacts.displayName,
  jobTitle: contacts.jobTitle,
  department: contacts.department,
  preferredLanguage: contacts.preferredLanguage,
  timezone: contacts.timezone,
  active: contacts.active,
  createdAt: contacts.createdAt,
  updatedAt: contacts.updatedAt,
  version: contacts.version,
}

export class ContactRepository {
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

  /**
   * Single authorization gate for every contact read and write. A miss is
   * always `ContactNotFoundError`, so out-of-scope, wrong-market and
   * nonexistent are indistinguishable to the caller.
   */
  private async resolveContact(
    executor: Transaction | typeof this.database,
    input: {
      actor: Principal
      marketId: number
      id: number
      scope: RecordScope
      forUpdate?: boolean
    },
  ) {
    const query = executor
      .select({ ...contactColumns, customerStatus: customers.status })
      .from(contacts)
      .innerJoin(
        customers,
        and(
          eq(customers.id, contacts.customerId),
          eq(customers.marketId, contacts.marketId),
        ),
      )
      .where(
        and(
          eq(contacts.id, input.id),
          eq(contacts.marketId, input.marketId),
          parentScope(input.scope, input.actor),
        ),
      )
      .limit(1)
    const [row] = input.forUpdate ? await query.for('update', { of: contacts }) : await query
    if (!row) throw new ContactNotFoundError()
    return row
  }

  private async lockParentContact(
    transaction: Transaction,
    input: {
      actor: Principal
      marketId: number
      id: number
      scope: RecordScope
      expectedVersion: number
      requireActive?: boolean
    },
  ) {
    const current = await this.resolveContact(transaction, {
      ...input,
      forUpdate: true,
    })
    if (current.version !== input.expectedVersion)
      throw new ContactConflictError()
    if (input.requireActive !== false && !current.active)
      throw new Error('CONTACT_INACTIVE')
    return current
  }

  private async bumpContact(
    transaction: Transaction,
    input: { marketId: number; id: number; expectedVersion: number },
  ) {
    const [updated] = await transaction
      .update(contacts)
      .set({ updatedAt: new Date(), version: sql`${contacts.version} + 1` })
      .where(
        and(
          eq(contacts.id, input.id),
          eq(contacts.marketId, input.marketId),
          eq(contacts.version, input.expectedVersion),
        ),
      )
      .returning(contactColumns)
    if (!updated) throw new ContactConflictError()
    return updated
  }

  private async primaryContexts(
    executor: Transaction | typeof this.database,
    marketId: number,
    contactId: number,
  ) {
    const rows = await executor
      .select({ context: customerPrimaryContacts.context })
      .from(customerPrimaryContacts)
      .where(
        and(
          eq(customerPrimaryContacts.marketId, marketId),
          eq(customerPrimaryContacts.contactId, contactId),
        ),
      )
    return rows.map((row) => row.context)
  }

  async list(input: {
    actor: Principal
    marketId: number
    scope: RecordScope
    customerId?: number
    active?: boolean
    query?: string
    limit: number
    cursor?: { timestamp: string; id: number }
  }) {
    this.assertMarketAccess(input.actor, input.marketId)
    const conditions: SQL[] = [
      eq(contacts.marketId, input.marketId),
      parentScope(input.scope, input.actor),
    ]
    if (input.customerId)
      conditions.push(eq(contacts.customerId, input.customerId))
    if (typeof input.active === 'boolean')
      conditions.push(eq(contacts.active, input.active))
    if (input.query)
      conditions.push(ilike(contacts.displayName, safeSearch(input.query)))
    if (input.cursor) {
      const createdAt = new Date(input.cursor.timestamp)
      conditions.push(
        or(
          lt(contacts.createdAt, createdAt),
          and(eq(contacts.createdAt, createdAt), lt(contacts.id, input.cursor.id)),
        )!,
      )
    }
    const rows = await this.database
      .select({
        ...contactColumns,
        customerLegalName: customers.legalName,
      })
      .from(contacts)
      .innerJoin(
        customers,
        and(
          eq(customers.id, contacts.customerId),
          eq(customers.marketId, contacts.marketId),
        ),
      )
      .where(and(...conditions))
      .orderBy(desc(contacts.createdAt), desc(contacts.id))
      .limit(input.limit + 1)
    const hasMore = rows.length > input.limit
    const items = hasMore ? rows.slice(0, input.limit) : rows
    const last = items.at(-1)
    const historyItems = await this.listEntitledContactHistory({
      userId: input.actor.userId,
      marketId: input.marketId,
      customerId: input.customerId,
      query: input.query,
      active: input.active,
      limit: input.limit,
    })
    return {
      items,
      historyItems,
      nextCursor:
        hasMore && last ? encodeContactCursor(last.createdAt, last.id) : null,
    }
  }

  async get(input: {
    actor: Principal
    marketId: number
    id: number
    scope: RecordScope
  }) {
    this.assertMarketAccess(input.actor, input.marketId)
    try {
      const contact = await this.resolveContact(this.database, input)
      const primaryContexts = await this.primaryContexts(
        this.database,
        input.marketId,
        input.id,
      )
      return { contact, primaryContexts, historical: false as const }
    } catch (error) {
      if (!(error instanceof ContactNotFoundError)) throw error
      const history = await this.getEntitledContactHistory(
        input.actor.userId,
        input.marketId,
        input.id,
      )
      const latest = history[0]
      if (!latest) throw error
      return {
        contact: latest.payload,
        primaryContexts:
          (latest.payload.primaryContexts as string[] | undefined) ?? [],
        historical: true as const,
        transferredAt: latest.transferredAt,
      }
    }
  }

  async create(input: {
    actor: Principal
    requestId: string
    marketId: number
    scope: RecordScope
    values: {
      customerId: number
      displayName: string
      jobTitle?: string | null
      department?: string | null
      preferredLanguage?: string | null
      timezone?: string | null
      channels: Array<{ kind: string; handle: string; isPrimary: boolean }>
    }
  }) {
    this.assertMarketAccess(input.actor, input.marketId)
    return this.database.transaction(async (transaction) => {
      const [parent] = await transaction
        .select({ id: customers.id, status: customers.status })
        .from(customers)
        .where(
          and(
            eq(customers.id, input.values.customerId),
            eq(customers.marketId, input.marketId),
            parentScope(input.scope, input.actor),
          ),
        )
        .limit(1)
      if (!parent) throw new Error('CONTACT_PARENT_NOT_ACCESSIBLE')
      if (parent.status === 'ARCHIVED')
        throw new Error('CONTACT_PARENT_NOT_ACCESSIBLE')
      const [contact] = await transaction
        .insert(contacts)
        .values({
          marketId: input.marketId,
          customerId: input.values.customerId,
          displayName: input.values.displayName,
          jobTitle: input.values.jobTitle ?? null,
          department: input.values.department ?? null,
          preferredLanguage: input.values.preferredLanguage ?? null,
          timezone: input.values.timezone ?? null,
        })
        .returning(contactColumns)
      for (const channel of input.values.channels) {
        if (channel.isPrimary)
          await this.clearPrimaryChannel(
            transaction,
            input.marketId,
            contact.id,
            channel.kind,
          )
        await transaction.insert(contactChannels).values({
          marketId: input.marketId,
          contactId: contact.id,
          kind: channel.kind,
          handle: channel.handle,
          normalizedHandle: normalizeChannelHandle(channel.kind, channel.handle),
          isPrimary: channel.isPrimary,
        })
      }
      await transaction.insert(recordLinks).values({
        marketId: input.marketId,
        contactId: contact.id,
      })
      await transaction.insert(auditEvents).values({
        marketId: input.marketId,
        actorId: input.actor.userId,
        action: 'contact.created',
        resourceType: 'contact',
        resourceId: contact.id,
        resourceVersion: contact.version,
        requestId: input.requestId,
        safeDiff: projectSafeAuditDiff({
          changedFields: ['displayName'],
        }),
        result: 'SUCCESS',
      })
      return contact
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
      await this.lockParentContact(transaction, {
        actor: input.actor,
        marketId: input.marketId,
        id: input.id,
        scope: input.scope,
        expectedVersion: input.version,
      })
      const [updated] = await transaction
        .update(contacts)
        .set({
          ...(input.patch as Partial<typeof contacts.$inferInsert>),
          updatedAt: new Date(),
          version: sql`${contacts.version} + 1`,
        })
        .where(
          and(
            eq(contacts.id, input.id),
            eq(contacts.marketId, input.marketId),
            eq(contacts.version, input.version),
          ),
        )
        .returning(contactColumns)
      if (!updated) throw new ContactConflictError()
      await transaction.insert(auditEvents).values({
        marketId: input.marketId,
        actorId: input.actor.userId,
        action: 'contact.updated',
        resourceType: 'contact',
        resourceId: updated.id,
        resourceVersion: updated.version,
        requestId: input.requestId,
        safeDiff: projectSafeAuditDiff({
          changedFields: Object.keys(input.patch),
        }),
        result: 'SUCCESS',
      })
      return updated
    })
  }

  async listChannels(input: {
    actor: Principal
    marketId: number
    id: number
    scope: RecordScope
  }) {
    this.assertMarketAccess(input.actor, input.marketId)
    await this.resolveContact(this.database, input)
    return this.database
      .select({
        id: contactChannels.id,
        contactId: contactChannels.contactId,
        kind: contactChannels.kind,
        handle: contactChannels.handle,
        isPrimary: contactChannels.isPrimary,
        verifiedAt: contactChannels.verifiedAt,
        version: contactChannels.version,
      })
      .from(contactChannels)
      .where(
        and(
          eq(contactChannels.marketId, input.marketId),
          eq(contactChannels.contactId, input.id),
        ),
      )
      .orderBy(contactChannels.kind, contactChannels.id)
  }

  private async clearPrimaryChannel(
    transaction: Transaction,
    marketId: number,
    contactId: number,
    kind: string,
  ) {
    await transaction
      .update(contactChannels)
      .set({ isPrimary: false, updatedAt: new Date(), version: sql`${contactChannels.version} + 1` })
      .where(
        and(
          eq(contactChannels.marketId, marketId),
          eq(contactChannels.contactId, contactId),
          eq(contactChannels.kind, kind),
          eq(contactChannels.isPrimary, true),
        ),
      )
  }

  async createChannel(input: {
    actor: Principal
    requestId: string
    marketId: number
    id: number
    scope: RecordScope
    version: number
    values: { kind: string; handle: string; isPrimary: boolean }
  }) {
    this.assertMarketAccess(input.actor, input.marketId)
    return this.database.transaction(async (transaction) => {
      await this.lockParentContact(transaction, {
        actor: input.actor,
        marketId: input.marketId,
        id: input.id,
        scope: input.scope,
        expectedVersion: input.version,
      })
      if (input.values.isPrimary)
        await this.clearPrimaryChannel(
          transaction,
          input.marketId,
          input.id,
          input.values.kind,
        )
      const [channel] = await transaction
        .insert(contactChannels)
        .values({
          marketId: input.marketId,
          contactId: input.id,
          kind: input.values.kind,
          handle: input.values.handle,
          normalizedHandle: normalizeChannelHandle(
            input.values.kind,
            input.values.handle,
          ),
          isPrimary: input.values.isPrimary,
        })
        .returning({
          id: contactChannels.id,
          contactId: contactChannels.contactId,
          kind: contactChannels.kind,
          handle: contactChannels.handle,
          isPrimary: contactChannels.isPrimary,
          verifiedAt: contactChannels.verifiedAt,
          version: contactChannels.version,
        })
      const parent = await this.bumpContact(transaction, {
        marketId: input.marketId,
        id: input.id,
        expectedVersion: input.version,
      })
      await transaction.insert(auditEvents).values({
        marketId: input.marketId,
        actorId: input.actor.userId,
        action: 'contact.channel_recorded',
        resourceType: 'contact',
        resourceId: input.id,
        resourceVersion: parent.version,
        requestId: input.requestId,
        safeDiff: projectSafeAuditDiff({ channelKind: input.values.kind }),
        result: 'SUCCESS',
      })
      return { channel, contact: parent }
    })
  }

  async updateChannel(input: {
    actor: Principal
    requestId: string
    marketId: number
    id: number
    childId: number
    scope: RecordScope
    version: number
    patch: { kind?: string; handle?: string; isPrimary?: boolean }
  }) {
    this.assertMarketAccess(input.actor, input.marketId)
    return this.database.transaction(async (transaction) => {
      await this.lockParentContact(transaction, {
        actor: input.actor,
        marketId: input.marketId,
        id: input.id,
        scope: input.scope,
        expectedVersion: input.version,
      })
      const [current] = await transaction
        .select()
        .from(contactChannels)
        .where(
          and(
            eq(contactChannels.id, input.childId),
            eq(contactChannels.marketId, input.marketId),
            eq(contactChannels.contactId, input.id),
          ),
        )
        .for('update')
        .limit(1)
      if (!current) throw new ContactNotFoundError()
      const kind = input.patch.kind ?? current.kind
      const handle = input.patch.handle ?? current.handle
      const isPrimary = input.patch.isPrimary ?? current.isPrimary
      if (isPrimary) {
        await transaction
          .update(contactChannels)
          .set({
            isPrimary: false,
            updatedAt: new Date(),
            version: sql`${contactChannels.version} + 1`,
          })
          .where(
            and(
              eq(contactChannels.marketId, input.marketId),
              eq(contactChannels.contactId, input.id),
              eq(contactChannels.kind, kind),
              eq(contactChannels.isPrimary, true),
              ne(contactChannels.id, input.childId),
            ),
          )
      }
      const [channel] = await transaction
        .update(contactChannels)
        .set({
          kind,
          handle,
          normalizedHandle: normalizeChannelHandle(kind, handle),
          isPrimary,
          updatedAt: new Date(),
          version: sql`${contactChannels.version} + 1`,
        })
        .where(
          and(
            eq(contactChannels.id, input.childId),
            eq(contactChannels.marketId, input.marketId),
            eq(contactChannels.contactId, input.id),
          ),
        )
        .returning({
          id: contactChannels.id,
          contactId: contactChannels.contactId,
          kind: contactChannels.kind,
          handle: contactChannels.handle,
          isPrimary: contactChannels.isPrimary,
          verifiedAt: contactChannels.verifiedAt,
          version: contactChannels.version,
        })
      if (!channel) throw new ContactConflictError()
      const parent = await this.bumpContact(transaction, {
        marketId: input.marketId,
        id: input.id,
        expectedVersion: input.version,
      })
      await transaction.insert(auditEvents).values({
        marketId: input.marketId,
        actorId: input.actor.userId,
        action: 'contact.channel_updated',
        resourceType: 'contact',
        resourceId: input.id,
        resourceVersion: parent.version,
        requestId: input.requestId,
        safeDiff: projectSafeAuditDiff({ channelKind: kind }),
        result: 'SUCCESS',
      })
      return { channel, contact: parent }
    })
  }

  async listPreferences(input: {
    actor: Principal
    marketId: number
    id: number
    scope: RecordScope
  }) {
    this.assertMarketAccess(input.actor, input.marketId)
    await this.resolveContact(this.database, input)
    return this.database
      .select({
        id: contactPreferences.id,
        contactId: contactPreferences.contactId,
        purpose: contactPreferences.purpose,
        allowed: contactPreferences.allowed,
        evidenceFileId: contactPreferences.evidenceFileId,
        recordedAt: contactPreferences.recordedAt,
        version: contactPreferences.version,
      })
      .from(contactPreferences)
      .where(
        and(
          eq(contactPreferences.marketId, input.marketId),
          eq(contactPreferences.contactId, input.id),
        ),
      )
      .orderBy(contactPreferences.purpose)
  }

  private async assertEvidenceFile(
    transaction: Transaction,
    marketId: number,
    fileId: number,
  ) {
    const [file] = await transaction
      .select({ id: files.id })
      .from(files)
      .where(
        and(
          eq(files.id, fileId),
          eq(files.marketId, marketId),
          eq(files.scanState, 'CLEAN'),
        ),
      )
      .limit(1)
    if (!file) throw new Error('CONTACT_EVIDENCE_FILE_INVALID')
  }

  async upsertPreference(input: {
    actor: Principal
    requestId: string
    marketId: number
    id: number
    scope: RecordScope
    version: number
    values: {
      purpose: string
      allowed: boolean
      evidenceFileId?: number | null
      recordedAt: Date
    }
  }) {
    this.assertMarketAccess(input.actor, input.marketId)
    return this.database.transaction(async (transaction) => {
      await this.lockParentContact(transaction, {
        actor: input.actor,
        marketId: input.marketId,
        id: input.id,
        scope: input.scope,
        expectedVersion: input.version,
      })
      if (typeof input.values.evidenceFileId === 'number')
        await this.assertEvidenceFile(
          transaction,
          input.marketId,
          input.values.evidenceFileId,
        )
      const [preference] = await transaction
        .insert(contactPreferences)
        .values({
          marketId: input.marketId,
          contactId: input.id,
          purpose: input.values.purpose,
          allowed: input.values.allowed,
          evidenceFileId: input.values.evidenceFileId ?? null,
          recordedAt: input.values.recordedAt,
        })
        .onConflictDoUpdate({
          target: [
            contactPreferences.marketId,
            contactPreferences.contactId,
            contactPreferences.purpose,
          ],
          set: {
            allowed: input.values.allowed,
            evidenceFileId: input.values.evidenceFileId ?? null,
            recordedAt: input.values.recordedAt,
            updatedAt: new Date(),
            version: sql`${contactPreferences.version} + 1`,
          },
        })
        .returning({
          id: contactPreferences.id,
          contactId: contactPreferences.contactId,
          purpose: contactPreferences.purpose,
          allowed: contactPreferences.allowed,
          evidenceFileId: contactPreferences.evidenceFileId,
          recordedAt: contactPreferences.recordedAt,
          version: contactPreferences.version,
        })
      const parent = await this.bumpContact(transaction, {
        marketId: input.marketId,
        id: input.id,
        expectedVersion: input.version,
      })
      await transaction.insert(auditEvents).values({
        marketId: input.marketId,
        actorId: input.actor.userId,
        action: 'contact.preference_recorded',
        resourceType: 'contact',
        resourceId: input.id,
        resourceVersion: parent.version,
        requestId: input.requestId,
        safeDiff: projectSafeAuditDiff({
          preferencePurpose: input.values.purpose,
          allowed: input.values.allowed,
        }),
        result: 'SUCCESS',
      })
      return { preference, contact: parent }
    })
  }

  async updatePreference(input: {
    actor: Principal
    requestId: string
    marketId: number
    id: number
    childId: number
    scope: RecordScope
    version: number
    patch: {
      purpose?: string
      allowed?: boolean
      evidenceFileId?: number | null
      recordedAt?: Date
    }
  }) {
    this.assertMarketAccess(input.actor, input.marketId)
    return this.database.transaction(async (transaction) => {
      await this.lockParentContact(transaction, {
        actor: input.actor,
        marketId: input.marketId,
        id: input.id,
        scope: input.scope,
        expectedVersion: input.version,
      })
      if (typeof input.patch.evidenceFileId === 'number')
        await this.assertEvidenceFile(
          transaction,
          input.marketId,
          input.patch.evidenceFileId,
        )
      const [preference] = await transaction
        .update(contactPreferences)
        .set({
          ...input.patch,
          updatedAt: new Date(),
          version: sql`${contactPreferences.version} + 1`,
        })
        .where(
          and(
            eq(contactPreferences.id, input.childId),
            eq(contactPreferences.marketId, input.marketId),
            eq(contactPreferences.contactId, input.id),
          ),
        )
        .returning({
          id: contactPreferences.id,
          contactId: contactPreferences.contactId,
          purpose: contactPreferences.purpose,
          allowed: contactPreferences.allowed,
          evidenceFileId: contactPreferences.evidenceFileId,
          recordedAt: contactPreferences.recordedAt,
          version: contactPreferences.version,
        })
      if (!preference) throw new ContactNotFoundError()
      const parent = await this.bumpContact(transaction, {
        marketId: input.marketId,
        id: input.id,
        expectedVersion: input.version,
      })
      await transaction.insert(auditEvents).values({
        marketId: input.marketId,
        actorId: input.actor.userId,
        action: 'contact.preference_updated',
        resourceType: 'contact',
        resourceId: input.id,
        resourceVersion: parent.version,
        requestId: input.requestId,
        safeDiff: projectSafeAuditDiff({
          preferencePurpose: preference.purpose,
          allowed: preference.allowed,
        }),
        result: 'SUCCESS',
      })
      return { preference, contact: parent }
    })
  }

  async setPrimary(input: {
    actor: Principal
    requestId: string
    marketId: number
    id: number
    scope: RecordScope
    version: number
    context: string
  }) {
    this.assertMarketAccess(input.actor, input.marketId)
    return this.database.transaction(async (transaction) => {
      const current = await this.lockParentContact(transaction, {
        actor: input.actor,
        marketId: input.marketId,
        id: input.id,
        scope: input.scope,
        expectedVersion: input.version,
      })
      const [existing] = await transaction
        .select({ contactId: customerPrimaryContacts.contactId })
        .from(customerPrimaryContacts)
        .where(
          and(
            eq(customerPrimaryContacts.marketId, input.marketId),
            eq(customerPrimaryContacts.customerId, current.customerId),
            eq(customerPrimaryContacts.context, input.context),
          ),
        )
        .for('update')
        .limit(1)
      await transaction
        .insert(customerPrimaryContacts)
        .values({
          marketId: input.marketId,
          customerId: current.customerId,
          contactId: input.id,
          context: input.context,
        })
        .onConflictDoUpdate({
          target: [
            customerPrimaryContacts.marketId,
            customerPrimaryContacts.customerId,
            customerPrimaryContacts.context,
          ],
          set: {
            contactId: input.id,
            updatedAt: new Date(),
            version: sql`${customerPrimaryContacts.version} + 1`,
          },
        })
      const parent = await this.bumpContact(transaction, {
        marketId: input.marketId,
        id: input.id,
        expectedVersion: input.version,
      })
      await transaction.insert(auditEvents).values({
        marketId: input.marketId,
        actorId: input.actor.userId,
        action: 'contact.primary_set',
        resourceType: 'contact',
        resourceId: input.id,
        resourceVersion: parent.version,
        requestId: input.requestId,
        safeDiff: projectSafeAuditDiff({
          context: input.context,
          ...(existing?.contactId ? { previousContactId: existing.contactId } : {}),
        }),
        result: 'SUCCESS',
      })
      const primaryContexts = await this.primaryContexts(
        transaction,
        input.marketId,
        input.id,
      )
      return { contact: parent, primaryContexts }
    })
  }

  async deactivate(input: {
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
      await this.lockParentContact(transaction, {
        actor: input.actor,
        marketId: input.marketId,
        id: input.id,
        scope: input.scope,
        expectedVersion: input.version,
      })
      const [updated] = await transaction
        .update(contacts)
        .set({
          active: false,
          updatedAt: new Date(),
          version: sql`${contacts.version} + 1`,
        })
        .where(
          and(
            eq(contacts.id, input.id),
            eq(contacts.marketId, input.marketId),
            eq(contacts.version, input.version),
          ),
        )
        .returning(contactColumns)
      if (!updated) throw new ContactConflictError()
      await transaction.insert(auditEvents).values({
        marketId: input.marketId,
        actorId: input.actor.userId,
        action: 'contact.deactivated',
        resourceType: 'contact',
        resourceId: updated.id,
        resourceVersion: updated.version,
        requestId: input.requestId,
        reason: input.reason,
        safeDiff: projectSafeAuditDiff({ active: false }),
        result: 'SUCCESS',
      })
      return updated
    })
  }

  async transfer(input: {
    actor: Principal
    requestId: string
    marketId: number
    id: number
    scope: RecordScope
    version: number
    targetCustomerId: number
    reason: string
  }) {
    this.assertMarketAccess(input.actor, input.marketId)
    return this.database.transaction(async (transaction) => {
      const current = await this.lockParentContact(transaction, {
        actor: input.actor,
        marketId: input.marketId,
        id: input.id,
        scope: input.scope,
        expectedVersion: input.version,
      })
      if (current.customerId === input.targetCustomerId)
        throw new Error('CONTACT_TRANSFER_TARGET_UNCHANGED')
      const [target] = await transaction
        .select({ id: customers.id, status: customers.status })
        .from(customers)
        .where(
          and(
            eq(customers.id, input.targetCustomerId),
            eq(customers.marketId, input.marketId),
            parentScope(input.scope, input.actor),
          ),
        )
        .limit(1)
      if (!target || target.status === 'ARCHIVED')
        throw new Error('CONTACT_TRANSFER_TARGET_INVALID')
      await transaction
        .delete(customerPrimaryContacts)
        .where(
          and(
            eq(customerPrimaryContacts.marketId, input.marketId),
            eq(customerPrimaryContacts.customerId, current.customerId),
            eq(customerPrimaryContacts.contactId, input.id),
          ),
        )
      const [updated] = await transaction
        .update(contacts)
        .set({
          customerId: input.targetCustomerId,
          updatedAt: new Date(),
          version: sql`${contacts.version} + 1`,
        })
        .where(
          and(
            eq(contacts.id, input.id),
            eq(contacts.marketId, input.marketId),
            eq(contacts.version, input.version),
          ),
        )
        .returning(contactColumns)
      if (!updated) throw new ContactConflictError()
      await transaction.insert(auditEvents).values({
        marketId: input.marketId,
        actorId: input.actor.userId,
        action: 'contact.transferred',
        resourceType: 'contact',
        resourceId: updated.id,
        resourceVersion: updated.version,
        requestId: input.requestId,
        reason: input.reason,
        safeDiff: projectSafeAuditDiff({
          formerCustomerId: current.customerId,
          newCustomerId: input.targetCustomerId,
        }),
        result: 'SUCCESS',
      })
      return updated
    })
  }

  async timeline(input: {
    actor: Principal
    marketId: number
    id: number
    scope: RecordScope
    limit: number
    cursor?: { timestamp: string; id: number }
  }) {
    this.assertMarketAccess(input.actor, input.marketId)
    await this.resolveContact(this.database, input)
    const conditions: SQL[] = [
      eq(auditEvents.marketId, input.marketId),
      eq(auditEvents.resourceType, 'contact'),
      eq(auditEvents.resourceId, input.id),
    ]
    if (input.cursor) {
      const occurredAt = new Date(input.cursor.timestamp)
      conditions.push(
        or(
          lt(auditEvents.occurredAt, occurredAt),
          and(
            eq(auditEvents.occurredAt, occurredAt),
            lt(auditEvents.id, input.cursor.id),
          ),
        )!,
      )
    }
    const rows = await this.database
      .select({
        id: auditEvents.id,
        actorId: auditEvents.actorId,
        action: auditEvents.action,
        resourceVersion: auditEvents.resourceVersion,
        reason: auditEvents.reason,
        safeDiff: auditEvents.safeDiff,
        result: auditEvents.result,
        occurredAt: auditEvents.occurredAt,
      })
      .from(auditEvents)
      .where(and(...conditions))
      .orderBy(desc(auditEvents.occurredAt), desc(auditEvents.id))
      .limit(input.limit + 1)
    const hasMore = rows.length > input.limit
    const items = hasMore ? rows.slice(0, input.limit) : rows
    const last = items.at(-1)
    return {
      items,
      nextCursor:
        hasMore && last
          ? encodeContactCursor(last.occurredAt, last.id, 'occurredAt')
          : null,
    }
  }

  async duplicateCandidates(input: {
    actor: Principal
    marketId: number
    scope: RecordScope
    contactId?: number
    customerId?: number
    channels: Array<{ kind: string; handle: string }>
  }) {
    this.assertMarketAccess(input.actor, input.marketId)
    if (!input.channels.length) return []
    const predicates = input.channels.map(({ kind, handle }) =>
      and(
        eq(contactChannels.kind, kind),
        eq(
          contactChannels.normalizedHandle,
          normalizeChannelHandle(kind, handle),
        ),
      ),
    )
    const conditions: SQL[] = [
      eq(contactChannels.marketId, input.marketId),
      eq(contacts.marketId, input.marketId),
      parentScope(input.scope, input.actor),
      or(...predicates)!,
    ]
    if (input.contactId)
      conditions.push(ne(contacts.id, input.contactId))
    const rows = await this.database
      .select({
        id: contacts.id,
        displayName: contacts.displayName,
        jobTitle: contacts.jobTitle,
        customerId: contacts.customerId,
        customerLegalName: customers.legalName,
        active: contacts.active,
        matchedKind: contactChannels.kind,
      })
      .from(contactChannels)
      .innerJoin(
        contacts,
        and(
          eq(contacts.id, contactChannels.contactId),
          eq(contacts.marketId, contactChannels.marketId),
        ),
      )
      .innerJoin(
        customers,
        and(
          eq(customers.id, contacts.customerId),
          eq(customers.marketId, contacts.marketId),
        ),
      )
      .where(and(...conditions))
      .groupBy(
        contacts.id,
        contacts.displayName,
        contacts.jobTitle,
        contacts.customerId,
        customers.legalName,
        contacts.active,
        contactChannels.kind,
      )
      .limit(25)
    return rows.map((row) => ({
      ...row,
      sameCustomer: input.customerId ? row.customerId === input.customerId : false,
    }))
  }

  async getEntitledContactHistory(
    userId: number,
    marketId: number,
    contactId: number,
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
      .innerJoin(recordLinks, eq(recordLinks.id, historySnapshots.recordLinkId))
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
          eq(recordLinks.contactId, contactId),
        ),
      )
      .orderBy(desc(historySnapshots.createdAt), desc(historySnapshots.id))
    return rows.map((row) => ({
      payload: row.payload as Record<string, unknown>,
      transferredAt: row.transferredAt,
    }))
  }

  async listEntitledContactHistory(input: {
    userId: number
    marketId: number
    customerId?: number
    query?: string
    active?: boolean
    limit: number
  }) {
    const conditions: SQL[] = [
      eq(historyEntitlements.userId, input.userId),
      eq(historyEntitlements.marketId, input.marketId),
      eq(historySnapshots.marketId, input.marketId),
      eq(recordLinks.marketId, input.marketId),
      isNotNull(recordLinks.contactId),
    ]
    if (input.customerId)
      conditions.push(
        sql`${historySnapshots.payload}->>'customerId' = ${String(input.customerId)}`,
      )
    if (input.query)
      conditions.push(
        sql`${historySnapshots.payload}->>'displayName' ILIKE ${safeSearch(input.query)}`,
      )
    if (typeof input.active === 'boolean')
      conditions.push(
        sql`${historySnapshots.payload}->>'active' = ${String(input.active)}`,
      )
    const rows = await this.database
      .select({
        contactId: recordLinks.contactId,
        transferredAt: customerTransfers.transferredAt,
        payload: historySnapshots.payload,
      })
      .from(historyEntitlements)
      .innerJoin(
        historySnapshots,
        eq(historySnapshots.id, historyEntitlements.snapshotId),
      )
      .innerJoin(recordLinks, eq(recordLinks.id, historySnapshots.recordLinkId))
      .innerJoin(
        customerTransfers,
        eq(customerTransfers.id, historySnapshots.transferId),
      )
      .where(and(...conditions))
      .orderBy(desc(customerTransfers.transferredAt), desc(historySnapshots.id))
      .limit(input.limit)
    return rows.map((row) => ({
      payload: row.payload as Record<string, unknown>,
      transferredAt: row.transferredAt,
    }))
  }
}
