import 'server-only'
import { requireGrant } from '@/modules/access-control/application/authorization'
import {
  AccessDeniedError,
  type EffectiveGrant,
  type Principal,
} from '@/modules/access-control/domain/types'
import { projectSafeAuditDiff } from '@/modules/access-control/application/audit-safe-diff'
import {
  channelInputSchema,
  contactDuplicateCandidatesSchema,
  contactListQuerySchema,
  contactTimelineQuerySchema,
  createContactSchema,
  deactivateContactSchema,
  decodeContactCursor,
  preferenceInputSchema,
  setPrimaryContactSchema,
  transferContactSchema,
  updateChannelSchema,
  updateContactSchema,
  updatePreferenceSchema,
} from './contracts'
import {
  ContactNotFoundError,
  ContactRepository,
} from '../infrastructure/contact-repository'

const writableFields = new Set([
  'displayName',
  'jobTitle',
  'department',
  'preferredLanguage',
  'timezone',
  'customerId',
  'channels',
  'preferences',
  'context',
  'active',
])

const projectableFields = [
  'id',
  'customerId',
  'customerLegalName',
  'displayName',
  'jobTitle',
  'department',
  'preferredLanguage',
  'timezone',
  'active',
  'version',
] as const

function allowedFields(fields: string[], value: Record<string, unknown>) {
  const permitted = new Set(fields)
  const requested = Object.keys(value).filter(
    (field) =>
      !['version', 'marketId', 'reason', 'targetCustomerId'].includes(field) &&
      value[field] !== undefined,
  )
  if (
    requested.some(
      (field) => !writableFields.has(field) || !permitted.has(field),
    )
  ) {
    throw new AccessDeniedError()
  }
}

function projectContact(
  value: Record<string, unknown>,
  readFields: string[],
) {
  const allowed = new Set(readFields)
  const result: Record<string, unknown> = {}
  for (const field of projectableFields) {
    if (allowed.has(field) && field in value) result[field] = value[field]
  }
  return result
}

export class ContactService {
  constructor(private readonly repository = new ContactRepository()) {}

  resolveMarketId(actor: Principal, marketCode: string) {
    return this.repository.resolveMarketId(actor, marketCode)
  }

  async list(
    actor: Principal,
    grants: EffectiveGrant[],
    rawQuery: unknown,
    marketId: number,
  ) {
    const query = contactListQuerySchema.parse(rawQuery)
    const policy = requireGrant(grants, 'contacts', 'list')
    const page = await this.repository.list({
      actor,
      marketId,
      scope: policy.scope,
      customerId: query.customerId,
      active: query.active,
      query: query.q,
      limit: query.limit,
      cursor: query.cursor ? decodeContactCursor(query.cursor) : undefined,
    })
    return {
      items: page.items.map((item) =>
        projectContact(item as Record<string, unknown>, policy.readFields),
      ),
      historyItems: page.historyItems.map((item) => ({
        ...projectContact(item.payload, policy.readFields),
        historical: true,
        transferredAt: item.transferredAt,
      })),
      nextCursor: page.nextCursor,
    }
  }

  async get(
    actor: Principal,
    grants: EffectiveGrant[],
    marketId: number,
    id: number,
  ) {
    const policy = requireGrant(grants, 'contacts', 'read')
    const record = await this.repository.get({
      actor,
      marketId,
      id,
      scope: policy.scope,
    })
    return {
      ...projectContact(
        record.contact as Record<string, unknown>,
        policy.readFields,
      ),
      primaryContexts: record.primaryContexts,
      historical: record.historical,
      ...(record.historical ? { transferredAt: record.transferredAt } : {}),
    }
  }

  async create(
    actor: Principal,
    grants: EffectiveGrant[],
    marketId: number,
    raw: unknown,
    requestId: string,
  ) {
    const value = createContactSchema.parse(raw)
    const policy = requireGrant(grants, 'contacts', 'create')
    allowedFields(policy.writeFields, value)
    const contact = await this.repository.create({
      actor,
      requestId,
      marketId,
      scope: policy.scope,
      values: value,
    })
    return projectContact(
      contact as Record<string, unknown>,
      requireGrant(grants, 'contacts', 'read').readFields,
    )
  }

  async update(
    actor: Principal,
    grants: EffectiveGrant[],
    marketId: number,
    id: number,
    raw: unknown,
    requestId: string,
  ) {
    const value = updateContactSchema.parse(raw)
    const policy = requireGrant(grants, 'contacts', 'edit')
    allowedFields(policy.writeFields, value)
    const { version, ...patch } = value
    const contact = await this.repository.update({
      actor,
      requestId,
      marketId,
      id,
      scope: policy.scope,
      version,
      patch,
    })
    return projectContact(
      contact as Record<string, unknown>,
      requireGrant(grants, 'contacts', 'read').readFields,
    )
  }

  async listChannels(
    actor: Principal,
    grants: EffectiveGrant[],
    marketId: number,
    id: number,
  ) {
    const policy = requireGrant(grants, 'contacts', 'sensitive-read')
    return this.repository.listChannels({
      actor,
      marketId,
      id,
      scope: policy.scope,
    })
  }

  async createChannel(
    actor: Principal,
    grants: EffectiveGrant[],
    marketId: number,
    id: number,
    raw: unknown,
    requestId: string,
  ) {
    const body = raw as Record<string, unknown>
    const version = expectVersion(body)
    const value = channelInputSchema.parse(omit(body, ['version']))
    const policy = requireGrant(grants, 'contacts', 'edit')
    const result = await this.repository.createChannel({
      actor,
      requestId,
      marketId,
      id,
      scope: policy.scope,
      version,
      values: value,
    })
    return {
      channel: result.channel,
      contact: projectContact(
        result.contact as Record<string, unknown>,
        requireGrant(grants, 'contacts', 'read').readFields,
      ),
    }
  }

  async updateChannel(
    actor: Principal,
    grants: EffectiveGrant[],
    marketId: number,
    id: number,
    childId: number,
    raw: unknown,
    requestId: string,
  ) {
    const value = updateChannelSchema.parse(raw)
    const policy = requireGrant(grants, 'contacts', 'edit')
    const { version, ...patch } = value
    const result = await this.repository.updateChannel({
      actor,
      requestId,
      marketId,
      id,
      childId,
      scope: policy.scope,
      version,
      patch,
    })
    return {
      channel: result.channel,
      contact: projectContact(
        result.contact as Record<string, unknown>,
        requireGrant(grants, 'contacts', 'read').readFields,
      ),
    }
  }

  async listPreferences(
    actor: Principal,
    grants: EffectiveGrant[],
    marketId: number,
    id: number,
  ) {
    const policy = requireGrant(grants, 'contacts', 'sensitive-read')
    return this.repository.listPreferences({
      actor,
      marketId,
      id,
      scope: policy.scope,
    })
  }

  async upsertPreference(
    actor: Principal,
    grants: EffectiveGrant[],
    marketId: number,
    id: number,
    raw: unknown,
    requestId: string,
  ) {
    const body = raw as Record<string, unknown>
    const version = expectVersion(body)
    const value = preferenceInputSchema.parse(omit(body, ['version']))
    const policy = requireGrant(grants, 'contacts', 'edit')
    const result = await this.repository.upsertPreference({
      actor,
      requestId,
      marketId,
      id,
      scope: policy.scope,
      version,
      values: value,
    })
    return {
      preference: result.preference,
      contact: projectContact(
        result.contact as Record<string, unknown>,
        requireGrant(grants, 'contacts', 'read').readFields,
      ),
    }
  }

  async updatePreference(
    actor: Principal,
    grants: EffectiveGrant[],
    marketId: number,
    id: number,
    childId: number,
    raw: unknown,
    requestId: string,
  ) {
    const value = updatePreferenceSchema.parse(raw)
    const policy = requireGrant(grants, 'contacts', 'edit')
    const { version, ...patch } = value
    const result = await this.repository.updatePreference({
      actor,
      requestId,
      marketId,
      id,
      childId,
      scope: policy.scope,
      version,
      patch,
    })
    return {
      preference: result.preference,
      contact: projectContact(
        result.contact as Record<string, unknown>,
        requireGrant(grants, 'contacts', 'read').readFields,
      ),
    }
  }

  async setPrimary(
    actor: Principal,
    grants: EffectiveGrant[],
    marketId: number,
    id: number,
    raw: unknown,
    requestId: string,
  ) {
    const value = setPrimaryContactSchema.parse(raw)
    const policy = requireGrant(grants, 'contacts', 'edit')
    allowedFields(policy.writeFields, { context: value.context })
    const result = await this.repository.setPrimary({
      actor,
      requestId,
      marketId,
      id,
      scope: policy.scope,
      version: value.version,
      context: value.context,
    })
    return {
      ...projectContact(
        result.contact as Record<string, unknown>,
        requireGrant(grants, 'contacts', 'read').readFields,
      ),
      primaryContexts: result.primaryContexts,
    }
  }

  async deactivate(
    actor: Principal,
    grants: EffectiveGrant[],
    marketId: number,
    id: number,
    raw: unknown,
    requestId: string,
  ) {
    const value = deactivateContactSchema.parse(raw)
    const policy = requireGrant(grants, 'contacts', 'edit')
    const contact = await this.repository.deactivate({
      actor,
      requestId,
      marketId,
      id,
      scope: policy.scope,
      version: value.version,
      reason: value.reason,
    })
    return projectContact(
      contact as Record<string, unknown>,
      requireGrant(grants, 'contacts', 'read').readFields,
    )
  }

  async transfer(
    actor: Principal,
    grants: EffectiveGrant[],
    marketId: number,
    id: number,
    raw: unknown,
    requestId: string,
  ) {
    const value = transferContactSchema.parse(raw)
    const policy = requireGrant(grants, 'contacts', 'edit')
    const contact = await this.repository.transfer({
      actor,
      requestId,
      marketId,
      id,
      scope: policy.scope,
      version: value.version,
      targetCustomerId: value.targetCustomerId,
      reason: value.reason,
    })
    return projectContact(
      contact as Record<string, unknown>,
      requireGrant(grants, 'contacts', 'read').readFields,
    )
  }

  async timeline(
    actor: Principal,
    grants: EffectiveGrant[],
    marketId: number,
    id: number,
    rawQuery: unknown,
  ) {
    const query = contactTimelineQuerySchema.parse(rawQuery)
    const policy = requireGrant(grants, 'contacts', 'read')
    const page = await this.repository.timeline({
      actor,
      marketId,
      id,
      scope: policy.scope,
      limit: query.limit,
      cursor: query.cursor
        ? decodeContactCursor(query.cursor, 'occurredAt')
        : undefined,
    })
    return {
      items: page.items.map((item) => ({
        ...item,
        safeDiff: projectSafeAuditDiff(item.safeDiff),
      })),
      nextCursor: page.nextCursor,
    }
  }

  async duplicateCandidates(
    actor: Principal,
    grants: EffectiveGrant[],
    marketId: number,
    raw: unknown,
  ) {
    const value = contactDuplicateCandidatesSchema.parse(raw)
    const policy = requireGrant(grants, 'contacts', 'list')
    const candidates = await this.repository.duplicateCandidates({
      actor,
      marketId,
      scope: policy.scope,
      contactId: value.contactId,
      customerId: value.customerId,
      channels: value.channels,
    })
    return candidates.map((candidate) => ({
      ...projectContact(
        candidate as unknown as Record<string, unknown>,
        policy.readFields,
      ),
      matchedKind: candidate.matchedKind,
      sameCustomer: candidate.sameCustomer,
    }))
  }
}

function expectVersion(body: Record<string, unknown>) {
  const version = body?.version
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1)
    throw new ContactVersionRequiredError()
  return version
}

function omit(value: Record<string, unknown>, keys: string[]) {
  const result: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value ?? {})) {
    if (!keys.includes(key)) result[key] = item
  }
  return result
}

export class ContactVersionRequiredError extends Error {
  constructor() {
    super('expectedVersion is required')
    this.name = 'ContactVersionRequiredError'
  }
}

export { ContactNotFoundError }
