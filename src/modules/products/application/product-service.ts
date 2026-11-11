import 'server-only'
import { requireGrant } from '@/modules/access-control/application/authorization'
import type { EffectiveGrant, Principal } from '@/modules/access-control/domain/types'
import { AccessDeniedError } from '@/modules/access-control/domain/types'
import {
  canTransitionProduct,
  createProductSchema,
  decodeProductCursor,
  productListQuerySchema,
  transitionProductSchema,
  updateProductSchema,
} from './contracts'
import {
  ProductNotFoundError,
  ProductRepository,
} from '../infrastructure/product-repository'

const writableFields = new Set([
  'sku',
  'category',
  'speciesCommonName',
  'speciesScientificName',
  'productFamily',
  'defaultUnit',
  'descriptionEn',
  'descriptionVi',
  'descriptionKo',
  'names',
  'aliases',
])

function allowedFields(fields: string[], value: Record<string, unknown>) {
  const permitted = new Set(fields)
  const requested = Object.keys(value).filter(
    (field) => !['version', 'reason'].includes(field) && value[field] !== undefined,
  )
  if (requested.some((field) => !writableFields.has(field) || !permitted.has(field))) {
    throw new AccessDeniedError()
  }
}

function projectProduct(
  value: Record<string, unknown>,
  readFields: string[],
) {
  const allowed = new Set(readFields)
  const result: Record<string, unknown> = {}
  for (const field of [
    'id',
    'sku',
    'displayName',
    'category',
    'speciesCommonName',
    'speciesScientificName',
    'productFamily',
    'defaultUnit',
    'status',
    'descriptionEn',
    'descriptionVi',
    'descriptionKo',
    'version',
  ]) {
    if (allowed.has(field) && field in value) result[field] = value[field]
  }
  if (allowed.has('names') && 'names' in value) result.names = value.names
  if (allowed.has('aliases') && 'aliases' in value) result.aliases = value.aliases
  return result
}

export class ProductService {
  constructor(private readonly repository = new ProductRepository()) {}

  async list(actor: Principal, grants: EffectiveGrant[], rawQuery: unknown) {
    const query = productListQuerySchema.parse(rawQuery)
    const policy = requireGrant(grants, 'products', 'read')
    const page = await this.repository.list({
      query: query.q,
      category: query.category,
      status: query.status,
      limit: query.limit,
      cursor: query.cursor ? decodeProductCursor(query.cursor) : undefined,
    })
    return {
      items: page.items.map((item) => projectProduct(item, policy.readFields)),
      nextCursor: page.nextCursor,
    }
  }

  async get(actor: Principal, grants: EffectiveGrant[], id: number) {
    const policy = requireGrant(grants, 'products', 'read')
    const record = await this.repository.get(id)
    if (!record) throw new ProductNotFoundError()
    return projectProduct(record, policy.readFields)
  }

  async create(
    actor: Principal,
    grants: EffectiveGrant[],
    raw: unknown,
    requestId: string,
  ) {
    const value = createProductSchema.parse(raw)
    const policy = requireGrant(grants, 'products', 'create')
    allowedFields(policy.writeFields, value)
    const product = await this.repository.create({
      actor,
      requestId,
      values: value,
    })
    const read = requireGrant(grants, 'products', 'read')
    return projectProduct(product, read.readFields)
  }

  async update(
    actor: Principal,
    grants: EffectiveGrant[],
    id: number,
    raw: unknown,
    requestId: string,
  ) {
    const value = updateProductSchema.parse(raw)
    const policy = requireGrant(grants, 'products', 'update')
    allowedFields(policy.writeFields, value)
    const { version, ...patch } = value
    const updated = await this.repository.update({
      actor,
      requestId,
      id,
      version,
      patch,
    })
    return projectProduct(
      updated,
      requireGrant(grants, 'products', 'read').readFields,
    )
  }

  async approve(
    actor: Principal,
    grants: EffectiveGrant[],
    id: number,
    raw: unknown,
    requestId: string,
  ) {
    return this.transition(actor, grants, 'approve', 'ACTIVE', id, raw, requestId)
  }

  async retire(
    actor: Principal,
    grants: EffectiveGrant[],
    id: number,
    raw: unknown,
    requestId: string,
  ) {
    return this.transition(actor, grants, 'retire', 'INACTIVE', id, raw, requestId)
  }

  async reactivate(
    actor: Principal,
    grants: EffectiveGrant[],
    id: number,
    raw: unknown,
    requestId: string,
  ) {
    return this.transition(actor, grants, 'approve', 'ACTIVE', id, raw, requestId)
  }

  private async transition(
    actor: Principal,
    grants: EffectiveGrant[],
    action: 'approve' | 'retire',
    to: string,
    id: number,
    raw: unknown,
    requestId: string,
  ) {
    const value = transitionProductSchema.parse(raw)
    requireGrant(grants, 'products', action)
    const updated = await this.repository.transition({
      actor,
      requestId,
      id,
      version: value.version,
      to,
      reason: value.reason,
      canTransition: canTransitionProduct,
    })
    return projectProduct(
      updated,
      requireGrant(grants, 'products', 'read').readFields,
    )
  }
}
