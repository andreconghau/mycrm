import 'server-only'
import { requireGrant } from '@/modules/access-control/application/authorization'
import type { EffectiveGrant, Principal } from '@/modules/access-control/domain/types'
import { AccessDeniedError } from '@/modules/access-control/domain/types'
import {
  approveRevisionSchema,
  archiveSpecificationSchema,
  comparableRevisionFields,
  createRevisionSchema,
  createSpecificationSchema,
  decodeSpecificationCursor,
  revisionCompareQuerySchema,
  specificationListQuerySchema,
  updateRevisionSchema,
} from './contracts'
import {
  specificationReadFields,
  specificationWriteFields,
} from '../domain/specification-grants'
import {
  missingApprovalFields,
} from '../domain/specification-lifecycle'
import { compareRevisionFields } from '../domain/specification-snapshot'
import {
  SpecificationNotFoundError,
  SpecificationRepository,
} from '../infrastructure/specification-repository'

/** Keys that are control metadata rather than specification content. */
const controlKeys = new Set([
  'version',
  'reason',
  'sourceRevisionNo',
  'productId',
  'customerId',
])

const writableFields = new Set<string>([
  ...specificationWriteFields,
  'productId',
  'customerId',
])

/**
 * Denies a write whose fields exceed the grant's write-field list. This is the
 * field-level half of the default-deny policy; the repository additionally
 * whitelists the columns it will actually set.
 */
function allowedFields(grantFields: string[], value: Record<string, unknown>) {
  const permitted = new Set(grantFields)
  const requested = Object.keys(value).filter(
    (field) => !controlKeys.has(field) && value[field] !== undefined,
  )
  if (
    requested.some((field) => !writableFields.has(field) || !permitted.has(field))
  ) {
    throw new AccessDeniedError()
  }
}

type Projectable = Record<string, unknown> | null | undefined

/** Projects only the fields the read grant allows. */
function project(value: Projectable, readFields: string[]): Projectable {
  if (!value) return value ?? null
  const allowed = new Set(readFields)
  const result: Record<string, unknown> = {}
  for (const field of specificationReadFields) {
    if (allowed.has(field) && field in value) result[field] = value[field]
  }
  // Derived, non-sensitive presentation values travel with the read grant on
  // the parent record rather than having their own field entries.
  for (const field of ['productSku', 'productName', 'productNames']) {
    if (allowed.has('productId') && field in value) result[field] = value[field]
  }
  return result
}

function projectSpecification(
  value: Record<string, unknown>,
  readFields: string[],
) {
  const base = project(value, readFields) as Record<string, unknown>
  const revisions = Array.isArray(value.revisions) ? value.revisions : []
  if (readFields.includes('revisions')) {
    base.revisions = revisions.map((revision) =>
      project(revision as Record<string, unknown>, readFields),
    )
  }
  if (readFields.includes('currentRevision')) {
    base.currentRevision = project(
      value.currentRevision as Projectable,
      readFields,
    )
    base.approvedRevision = project(
      value.approvedRevision as Projectable,
      readFields,
    )
    base.draftRevision = project(value.draftRevision as Projectable, readFields)
  }
  return base
}

export class SpecificationService {
  constructor(private readonly repository = new SpecificationRepository()) {}

  resolveMarketId(actor: Principal, marketCode: string) {
    return this.repository.resolveMarketId(actor, marketCode)
  }

  async list(
    actor: Principal,
    grants: EffectiveGrant[],
    rawQuery: unknown,
    marketId: number,
  ) {
    const query = specificationListQuerySchema.parse(rawQuery)
    const policy = requireGrant(grants, 'specifications', 'read')
    const page = await this.repository.list({
      actor,
      marketId,
      query: query.q,
      productId: query.productId,
      customerId: query.customerId,
      status: query.status,
      kind: query.kind,
      active: query.active === undefined ? undefined : query.active === 'true',
      limit: query.limit,
      cursor: query.cursor ? decodeSpecificationCursor(query.cursor) : undefined,
    })
    return {
      items: page.items.map((item) =>
        projectSpecification(item, policy.readFields),
      ),
      nextCursor: page.nextCursor,
    }
  }

  async get(
    actor: Principal,
    grants: EffectiveGrant[],
    marketId: number,
    id: number,
  ) {
    const policy = requireGrant(grants, 'specifications', 'read')
    const record = await this.repository.get(actor, marketId, id)
    const projected = projectSpecification(record, policy.readFields)
    // Surfacing the approval gap is a read-only aid for the UI; it never
    // relaxes the server-side check performed at approval time.
    projected.missingApprovalFields = record.draftRevision
      ? missingApprovalFields(
          record.draftRevision as unknown as Record<string, unknown>,
        )
      : []
    return projected
  }

  async listRevisions(
    actor: Principal,
    grants: EffectiveGrant[],
    marketId: number,
    id: number,
  ) {
    const policy = requireGrant(grants, 'specifications', 'read')
    const revisions = await this.repository.listRevisions(actor, marketId, id)
    return revisions.map((revision) =>
      project(revision as unknown as Record<string, unknown>, policy.readFields),
    )
  }

  async compareRevisions(
    actor: Principal,
    grants: EffectiveGrant[],
    marketId: number,
    id: number,
    rawQuery: unknown,
  ) {
    const policy = requireGrant(grants, 'specifications', 'read')
    const query = revisionCompareQuerySchema.parse(rawQuery)
    const [left, right] = await Promise.all([
      this.repository.getRevision(actor, marketId, id, query.left),
      this.repository.getRevision(actor, marketId, id, query.right),
    ])
    const visibleFields = comparableRevisionFields.filter((field) =>
      policy.readFields.includes(field),
    )
    return {
      left: project(left as unknown as Record<string, unknown>, policy.readFields),
      right: project(
        right as unknown as Record<string, unknown>,
        policy.readFields,
      ),
      differences: compareRevisionFields(
        left as unknown as Record<string, unknown>,
        right as unknown as Record<string, unknown>,
        visibleFields,
      ),
    }
  }

  async listRevisionDocuments(
    actor: Principal,
    grants: EffectiveGrant[],
    marketId: number,
    id: number,
    revisionNo: number,
  ) {
    requireGrant(grants, 'specifications', 'read')
    return this.repository.listRevisionDocuments(
      actor,
      marketId,
      id,
      revisionNo,
    )
  }

  /** The contract M10 Quotations consumes at submission time. */
  async getOfferSnapshot(
    actor: Principal,
    grants: EffectiveGrant[],
    marketId: number,
    id: number,
    revisionNo: number,
  ) {
    requireGrant(grants, 'specifications', 'read')
    return this.repository.buildOfferSnapshot({
      actor,
      marketId,
      specificationId: id,
      revisionNo,
    })
  }

  async create(
    actor: Principal,
    grants: EffectiveGrant[],
    marketId: number,
    productId: number,
    raw: unknown,
    requestId: string,
  ) {
    const value = createSpecificationSchema.parse(raw)
    const policy = requireGrant(grants, 'specifications', 'create')
    allowedFields(policy.writeFields, value)
    const { customerId, ...content } = value
    const created = await this.repository.create({
      actor,
      requestId,
      marketId,
      productId,
      customerId,
      values: content,
    })
    return projectSpecification(
      created,
      requireGrant(grants, 'specifications', 'read').readFields,
    )
  }

  async updateRevision(
    actor: Principal,
    grants: EffectiveGrant[],
    marketId: number,
    id: number,
    revisionNo: number,
    raw: unknown,
    requestId: string,
  ) {
    const value = updateRevisionSchema.parse(raw)
    const policy = requireGrant(grants, 'specifications', 'update')
    allowedFields(policy.writeFields, value)
    const { version, ...patch } = value
    const updated = await this.repository.updateRevision({
      actor,
      requestId,
      marketId,
      specificationId: id,
      revisionNo,
      revisionVersion: version,
      patch,
    })
    return project(
      updated as unknown as Record<string, unknown>,
      requireGrant(grants, 'specifications', 'read').readFields,
    )
  }

  async createRevision(
    actor: Principal,
    grants: EffectiveGrant[],
    marketId: number,
    id: number,
    raw: unknown,
    requestId: string,
  ) {
    const value = createRevisionSchema.parse(raw)
    const policy = requireGrant(grants, 'specifications', 'create')
    allowedFields(policy.writeFields, value)
    const { version, sourceRevisionNo, ...patch } = value
    const created = await this.repository.createRevision({
      actor,
      requestId,
      marketId,
      specificationId: id,
      specificationVersion: version,
      sourceRevisionNo,
      patch,
    })
    return project(
      created as unknown as Record<string, unknown>,
      requireGrant(grants, 'specifications', 'read').readFields,
    )
  }

  async publishRevision(
    actor: Principal,
    grants: EffectiveGrant[],
    marketId: number,
    id: number,
    revisionNo: number,
    raw: unknown,
    requestId: string,
  ) {
    const value = approveRevisionSchema.parse(raw)
    requireGrant(grants, 'specifications', 'approve')
    const approved = await this.repository.publishRevision({
      actor,
      requestId,
      marketId,
      specificationId: id,
      revisionNo,
      revisionVersion: value.version,
      reason: value.reason,
    })
    return project(
      approved as unknown as Record<string, unknown>,
      requireGrant(grants, 'specifications', 'read').readFields,
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
    const value = archiveSpecificationSchema.parse(raw)
    requireGrant(grants, 'specifications', 'archive')
    const archived = await this.repository.archive({
      actor,
      requestId,
      marketId,
      specificationId: id,
      specificationVersion: value.version,
      reason: value.reason,
    })
    return project(
      archived as unknown as Record<string, unknown>,
      requireGrant(grants, 'specifications', 'read').readFields,
    )
  }
}

export { SpecificationNotFoundError }
