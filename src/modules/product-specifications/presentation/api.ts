import { z } from 'zod'
import {
  authErrorResponse,
  requireCsrf,
  requirePermission,
} from '@/modules/access-control/application/request-auth'
import { requestCorrelationId } from '@/modules/access-control/application/request-correlation'
import { positiveIdSchema } from '@/modules/access-control/application/api-contracts'
import type {
  EffectiveGrant,
  Principal,
} from '@/modules/access-control/domain/types'
import { marketCodeSchema } from '../application/contracts'
import { SpecificationService } from '../application/specification-service'
import { ApprovalFieldsMissingError } from '../domain/specification-lifecycle'
import {
  MeasurementValidationError,
  UnsupportedUnitConversionError,
} from '../domain/specification-measurements'
import { SpecificationNotSnapshotableError } from '../domain/specification-snapshot'
import {
  CodeAllocationError,
  ProductNotEligibleError,
  SpecificationConflictError,
  SpecificationCustomerNotEligibleError,
  SpecificationImmutableError,
  SpecificationNotFoundError,
} from '../infrastructure/specification-repository'

const service = new SpecificationService()

const revisionNoSchema = z.coerce.number().int().positive().max(1_000_000)

function postgresErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  if ('code' in error && typeof error.code === 'string') return error.code
  if ('cause' in error) return postgresErrorCode(error.cause)
  return undefined
}

function responseFor(error: unknown) {
  if (error instanceof SpecificationNotFoundError) {
    return Response.json(
      { error: { code: 'NOT_FOUND', message: 'Specification not found' } },
      { status: 404 },
    )
  }
  if (error instanceof SpecificationConflictError) {
    return Response.json(
      { error: { code: 'VERSION_CONFLICT', message: error.message } },
      { status: 409 },
    )
  }
  if (error instanceof SpecificationImmutableError) {
    return Response.json(
      { error: { code: 'IMMUTABLE_REVISION', message: error.message } },
      { status: 409 },
    )
  }
  if (error instanceof ApprovalFieldsMissingError) {
    return Response.json(
      {
        error: {
          code: 'APPROVAL_FIELDS_MISSING',
          message: error.message,
          fields: error.fields,
        },
      },
      { status: 422 },
    )
  }
  if (error instanceof UnsupportedUnitConversionError) {
    return Response.json(
      {
        error: {
          code: 'UNSUPPORTED_UNIT_CONVERSION',
          message: error.message,
        },
      },
      { status: 422 },
    )
  }
  if (error instanceof MeasurementValidationError) {
    return Response.json(
      {
        error: {
          code: 'VALIDATION_FAILED',
          message: error.message,
          field: error.field,
        },
      },
      { status: 400 },
    )
  }
  if (error instanceof ProductNotEligibleError) {
    return Response.json(
      { error: { code: 'BUSINESS_RULE_VIOLATION', message: error.message } },
      { status: 409 },
    )
  }
  if (error instanceof SpecificationCustomerNotEligibleError) {
    return Response.json(
      { error: { code: 'BUSINESS_RULE_VIOLATION', message: error.message } },
      { status: 409 },
    )
  }
  if (error instanceof SpecificationNotSnapshotableError) {
    return Response.json(
      { error: { code: 'BUSINESS_RULE_VIOLATION', message: error.message } },
      { status: 409 },
    )
  }
  if (error instanceof CodeAllocationError) {
    return Response.json(
      { error: { code: 'CONFLICT', message: error.message } },
      { status: 409 },
    )
  }
  // The migration-0004 immutability trigger raises SQLSTATE 55000.
  if (postgresErrorCode(error) === '55000') {
    return Response.json(
      {
        error: {
          code: 'IMMUTABLE_REVISION',
          message:
            'An approved specification revision cannot be edited; create a new revision',
        },
      },
      { status: 409 },
    )
  }
  if (postgresErrorCode(error) === '23505') {
    return Response.json(
      {
        error: {
          code: 'CONFLICT',
          message: 'A conflicting specification value already exists',
        },
      },
      { status: 409 },
    )
  }
  return authErrorResponse(error)
}

/**
 * Single authorization gate. Resource/action grant, market membership and CSRF
 * are all checked server-side before any use case runs; the `?market=` value is
 * an input to authorization, never a substitute for it.
 */
async function protectedAction<T>(
  action: string,
  request: Request,
  fn: (context: {
    principal: Principal
    grants: EffectiveGrant[]
    marketId: number
  }) => Promise<T>,
  requireMutationCsrf = false,
  successStatus = 200,
) {
  try {
    const { principal, grants } = await requirePermission(
      'specifications',
      action,
    )
    if (requireMutationCsrf) await requireCsrf(request, principal.sessionId)
    const marketCode = marketCodeSchema.parse(
      new URL(request.url).searchParams.get('market'),
    )
    const marketId = await service.resolveMarketId(principal, marketCode)
    const data = await fn({ principal, grants, marketId })
    return Response.json(
      { data },
      {
        status: successStatus,
        headers: { 'Cache-Control': 'private, no-store' },
      },
    )
  } catch (error) {
    return responseFor(error)
  }
}

function listQuery(request: Request) {
  const params = new URL(request.url).searchParams
  const query: Record<string, string> = Object.fromEntries(params.entries())
  delete query.market
  return query
}

async function jsonBody(request: Request) {
  const body: unknown = await request.json().catch(() => undefined)
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new z.ZodError([])
  }
  return body
}

export function listSpecifications(request: Request) {
  return protectedAction('read', request, ({ principal, grants, marketId }) =>
    service.list(principal, grants, listQuery(request), marketId),
  )
}

export function listProductSpecifications(
  request: Request,
  productIdValue: string,
) {
  return protectedAction('read', request, ({ principal, grants, marketId }) =>
    service.list(
      principal,
      grants,
      {
        ...listQuery(request),
        productId: String(positiveIdSchema.parse(productIdValue)),
      },
      marketId,
    ),
  )
}

export function createProductSpecification(
  request: Request,
  productIdValue: string,
) {
  return protectedAction(
    'create',
    request,
    async ({ principal, grants, marketId }) =>
      service.create(
        principal,
        grants,
        marketId,
        positiveIdSchema.parse(productIdValue),
        await jsonBody(request),
        requestCorrelationId(request),
      ),
    true,
    201,
  )
}

export function getSpecification(request: Request, idValue: string) {
  return protectedAction('read', request, ({ principal, grants, marketId }) =>
    service.get(principal, grants, marketId, positiveIdSchema.parse(idValue)),
  )
}

export function listSpecificationRevisions(request: Request, idValue: string) {
  return protectedAction('read', request, ({ principal, grants, marketId }) =>
    service.listRevisions(
      principal,
      grants,
      marketId,
      positiveIdSchema.parse(idValue),
    ),
  )
}

export function compareSpecificationRevisions(
  request: Request,
  idValue: string,
) {
  return protectedAction('read', request, ({ principal, grants, marketId }) =>
    service.compareRevisions(
      principal,
      grants,
      marketId,
      positiveIdSchema.parse(idValue),
      listQuery(request),
    ),
  )
}

export function createSpecificationRevision(request: Request, idValue: string) {
  return protectedAction(
    'create',
    request,
    async ({ principal, grants, marketId }) =>
      service.createRevision(
        principal,
        grants,
        marketId,
        positiveIdSchema.parse(idValue),
        await jsonBody(request),
        requestCorrelationId(request),
      ),
    true,
    201,
  )
}

export function updateSpecificationRevision(
  request: Request,
  idValue: string,
  revisionValue: string,
) {
  return protectedAction(
    'update',
    request,
    async ({ principal, grants, marketId }) =>
      service.updateRevision(
        principal,
        grants,
        marketId,
        positiveIdSchema.parse(idValue),
        revisionNoSchema.parse(revisionValue),
        await jsonBody(request),
        requestCorrelationId(request),
      ),
    true,
  )
}

export function publishSpecificationRevision(
  request: Request,
  idValue: string,
  revisionValue: string,
) {
  return protectedAction(
    'approve',
    request,
    async ({ principal, grants, marketId }) =>
      service.publishRevision(
        principal,
        grants,
        marketId,
        positiveIdSchema.parse(idValue),
        revisionNoSchema.parse(revisionValue),
        await jsonBody(request),
        requestCorrelationId(request),
      ),
    true,
  )
}

export function getSpecificationRevisionSnapshot(
  request: Request,
  idValue: string,
  revisionValue: string,
) {
  return protectedAction('read', request, ({ principal, grants, marketId }) =>
    service.getOfferSnapshot(
      principal,
      grants,
      marketId,
      positiveIdSchema.parse(idValue),
      revisionNoSchema.parse(revisionValue),
    ),
  )
}

export function listSpecificationRevisionDocuments(
  request: Request,
  idValue: string,
  revisionValue: string,
) {
  return protectedAction('read', request, ({ principal, grants, marketId }) =>
    service.listRevisionDocuments(
      principal,
      grants,
      marketId,
      positiveIdSchema.parse(idValue),
      revisionNoSchema.parse(revisionValue),
    ),
  )
}

export function archiveSpecification(request: Request, idValue: string) {
  return protectedAction(
    'archive',
    request,
    async ({ principal, grants, marketId }) =>
      service.archive(
        principal,
        grants,
        marketId,
        positiveIdSchema.parse(idValue),
        await jsonBody(request),
        requestCorrelationId(request),
      ),
    true,
  )
}

export const specificationApiErrors = responseFor
