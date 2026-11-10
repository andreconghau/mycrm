import 'server-only'
import { requireGrant } from '@/modules/access-control/application/authorization'
import type { EffectiveGrant, Principal } from '@/modules/access-control/domain/types'
import { AccessDeniedError } from '@/modules/access-control/domain/types'
import {
  archiveCustomerSchema,
  createCustomerSchema,
  customerListQuerySchema,
  reassignCustomerSchema,
  updateCustomerSchema,
} from './contracts'
import { CustomerRepository } from '../infrastructure/customer-repository'

const writableFields = new Set([
  'code',
  'legalName',
  'tradeName',
  'countryCode',
  'preferredLanguage',
  'preferredCurrency',
  'website',
  'status',
  'ownerId',
  'teamId',
  'addresses',
  'identifiers',
])

function allowedFields(fields: string[], value: Record<string, unknown>) {
  const permitted = new Set(fields)
  const requested = Object.keys(value).filter(
    (field) => !['version', 'marketId', 'reason'].includes(field) && value[field] !== undefined,
  )
  if (requested.some((field) => !writableFields.has(field) || !permitted.has(field))) {
    throw new AccessDeniedError()
  }
}

function projectCustomer(
  value: Record<string, unknown>,
  readFields: string[],
) {
  const allowed = new Set(readFields)
  const result: Record<string, unknown> = {}
  for (const field of [
    'id',
    'code',
    'legalName',
    'tradeName',
    'countryCode',
    'preferredLanguage',
    'preferredCurrency',
    'website',
    'status',
    'ownerId',
    'teamId',
    'version',
  ]) {
    if (allowed.has(field) && field in value) result[field] = value[field]
  }
  return result
}

function projectHistory(
  value: Record<string, unknown>,
  readFields: string[],
  transferredAt: Date,
) {
  const projected = projectCustomer(value, readFields)
  if (readFields.includes('addresses')) projected.addresses = value.addresses
  if (readFields.includes('identifiers')) projected.identifiers = value.identifiers
  return {
    ...projected,
    historical: true,
    transferredAt,
  }
}

export class CustomerService {
  constructor(private readonly repository = new CustomerRepository()) {}

  resolveMarketId(actor: Principal, marketCode: string) {
    return this.repository.resolveMarketId(actor, marketCode)
  }

  listMarkets(actor: Principal) {
    return this.repository.listMarkets(actor)
  }

  async list(
    actor: Principal,
    grants: EffectiveGrant[],
    rawQuery: unknown,
    marketIdOverride?: number,
  ) {
    const query = customerListQuerySchema.parse(rawQuery)
    const policy = requireGrant(grants, 'customers', 'read')
    const marketId =
      marketIdOverride ??
      (await this.repository.resolveMarketId(actor, query.marketCode))
    const page = await this.repository.list({
      actor,
      marketId,
      scope: policy.scope,
      query: query.q,
      country: query.country,
      status: query.status,
      ownerId: query.owner,
      limit: query.limit,
      cursor: query.cursor ? decodeCustomerCursor(query.cursor) : undefined,
    })
    return {
      items: page.items.map((item) => projectCustomer(item, policy.readFields)),
      historyItems: page.historyItems.map((item) => ({
        ...projectHistory(
          item.payload as Record<string, unknown>,
          policy.readFields,
          item.transferredAt,
        ),
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
    const policy = requireGrant(grants, 'customers', 'read')
    const record = await this.repository.get({
      actor,
      marketId,
      id,
      scope: policy.scope,
    })
    if (!record) throw new CustomerNotFoundError()
    const customer = projectCustomer(
      record.customer as Record<string, unknown>,
      policy.readFields,
    )
    if (policy.readFields.includes('addresses'))
      customer.addresses = record.addresses
    if (policy.readFields.includes('identifiers'))
      customer.identifiers = record.identifiers
    const history = record.history.map((item) =>
      projectHistory(item.payload, policy.readFields, item.transferredAt),
    )
    return { ...customer, historical: record.historical, history }
  }

  async create(
    actor: Principal,
    grants: EffectiveGrant[],
    marketId: number,
    raw: unknown,
    requestId: string,
  ) {
    const value = createCustomerSchema.parse(raw)
    const policy = requireGrant(grants, 'customers', 'create')
    allowedFields(policy.writeFields, value)
    const ownerId = value.ownerId ?? actor.userId
    if (policy.scope === 'OWN' && ownerId !== actor.userId)
      throw new AccessDeniedError()
    const customer = await this.repository.create({
      actor,
      requestId,
      values: { ...value, marketId, ownerId, teamId: value.teamId ?? null },
    })
    const read = requireGrant(grants, 'customers', 'read')
    return projectCustomer(customer, read.readFields)
  }

  async update(
    actor: Principal,
    grants: EffectiveGrant[],
    marketId: number,
    id: number,
    raw: unknown,
    requestId: string,
  ) {
    const value = updateCustomerSchema.parse(raw)
    const policy = requireGrant(grants, 'customers', 'update')
    allowedFields(policy.writeFields, value)
    if (value.status === 'ARCHIVED') throw new AccessDeniedError()
    const { version, ...patch } = value
    const updated = await this.repository.update({
      actor,
      requestId,
      marketId,
      id,
      scope: policy.scope,
      version,
      patch,
    })
    return projectCustomer(
      updated,
      requireGrant(grants, 'customers', 'read').readFields,
    )
  }

  async reassign(
    actor: Principal,
    grants: EffectiveGrant[],
    marketId: number,
    id: number,
    raw: unknown,
    requestId: string,
  ) {
    const value = reassignCustomerSchema.parse(raw)
    const policy = requireGrant(grants, 'customers', 'reassign')
    allowedFields(policy.writeFields, value)
    const current = await this.repository.get({
        actor,
        marketId,
        id,
        scope: policy.scope,
      })
    if (!current || current.historical) throw new CustomerNotFoundError()
    const currentTeamId =
      typeof current.customer.teamId === 'number'
        ? current.customer.teamId
        : null
    if (policy.scope === 'TEAM') {
      if (
        value.teamId !== undefined &&
        value.teamId !== currentTeamId
      ) {
        throw new AccessDeniedError()
      }
    }
    const updated = await this.repository.reassign({
      actor,
      requestId,
      marketId,
      id,
      scope: policy.scope,
      version: value.version,
      ownerId: value.ownerId,
      teamId: value.teamId ?? currentTeamId,
      reason: value.reason,
    })
    return projectCustomer(
      updated,
      requireGrant(grants, 'customers', 'read').readFields,
    )
  }

  async archive(
    actor: Principal,
    grants: EffectiveGrant[],
    marketId: number,
    id: number,
    raw: unknown,
    requestId: string,
  ) {
    const value = archiveCustomerSchema.parse(raw)
    const policy = requireGrant(grants, 'customers', 'archive')
    const updated = await this.repository.archive({
      actor,
      requestId,
      marketId,
      id,
      scope: policy.scope,
      version: value.version,
      reason: value.reason,
    })
    return projectCustomer(
      updated,
      requireGrant(grants, 'customers', 'read').readFields,
    )
  }

  async duplicateCandidates(
    actor: Principal,
    grants: EffectiveGrant[],
    input: {
      marketId: number
      customerId?: number
      identifiers: Array<{ kind: string; value: string }>
    },
  ) {
    const policy = requireGrant(grants, 'customers', 'read')
    const candidates = await this.repository.duplicateCandidates({
      ...input,
      actor,
      scope: policy.scope,
    })
    return candidates.map((candidate) => {
      const projected: Record<string, unknown> = {}
      for (const field of [
        'id',
        'code',
        'legalName',
        'tradeName',
        'countryCode',
        'status',
      ]) {
        if (policy.readFields.includes(field))
          projected[field] = candidate[field as keyof typeof candidate]
      }
      return projected
    })
  }
}

function decodeCustomerCursor(value: string) {
  try {
    const decoded: unknown = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    )
    if (!decoded || typeof decoded !== 'object') return undefined
    const cursor = decoded as { createdAt?: unknown; id?: unknown }
    if (
      typeof cursor.createdAt !== 'string' ||
      Number.isNaN(Date.parse(cursor.createdAt)) ||
      typeof cursor.id !== 'number' ||
      !Number.isInteger(cursor.id) ||
      !Number.isSafeInteger(cursor.id) ||
      cursor.id < 1
    ) {
      return undefined
    }
    return { createdAt: cursor.createdAt, id: cursor.id }
  } catch {
    return undefined
  }
}

import { CustomerNotFoundError } from '../infrastructure/customer-repository'
