import { z } from 'zod'
import {
  authErrorResponse,
  requireCsrf,
  requirePermission,
} from '@/modules/access-control/application/request-auth'
import { requestCorrelationId } from '@/modules/access-control/application/request-correlation'
import { positiveIdSchema } from '@/modules/access-control/application/api-contracts'
import {
  type EffectiveGrant,
  type Principal,
} from '@/modules/access-control/domain/types'
import {
  CustomerConflictError,
  CustomerNotFoundError,
} from '../infrastructure/customer-repository'
import { CustomerService } from '../application/customer-service'
import { customerMarketCodeSchema } from '../application/contracts'

const service = new CustomerService()

function responseFor(error: unknown) {
  if (error instanceof CustomerNotFoundError) {
    return Response.json(
      { error: { code: 'NOT_FOUND', message: 'Customer not found' } },
      { status: 404 },
    )
  }
  if (error instanceof CustomerConflictError) {
    return Response.json(
      { error: { code: 'VERSION_CONFLICT', message: error.message } },
      { status: 409 },
    )
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  ) {
    return Response.json(
      { error: { code: 'CONFLICT', message: 'A conflicting customer value already exists' } },
      { status: 409 },
    )
  }
  if (error instanceof Error) {
    const messages: Record<string, string> = {
      CUSTOMER_OWNER_NOT_ACTIVE_IN_MARKET: 'The requested customer owner is invalid',
      CUSTOMER_TEAM_ASSIGNMENT_INVALID: 'The requested team assignment is invalid',
      INVALID_CUSTOMER_STATUS: 'Customer status is invalid',
      INVALID_CUSTOMER_TRANSITION: 'Customer status transition is invalid',
      CUSTOMER_OWNER_UNCHANGED: 'Customer already has this owner and team',
      CUSTOMER_HISTORY_LINK_MISSING: 'Customer history is unavailable',
    }
    const message = messages[error.message]
    if (message) {
      return Response.json(
        { error: { code: 'BUSINESS_RULE_VIOLATION', message } },
        { status: error.message === 'MARKET_ACCESS_DENIED' ? 403 : 409 },
      )
    }
  }
  return authErrorResponse(error)
}

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
    const { principal, grants } = await requirePermission('customers', action)
    if (requireMutationCsrf) await requireCsrf(request, principal.sessionId)
    const marketCode = customerMarketCodeSchema.parse(
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

export function listCustomers(request: Request) {
  return protectedAction('read', request, async ({ principal, grants, marketId }) => {
    const params = new URL(request.url).searchParams
    const query: Record<string, string> = Object.fromEntries(params.entries())
    query.marketCode = params.get('market') ?? ''
    delete query.market
    return service.list(principal, grants, query, marketId)
  })
}

export function createCustomer(request: Request) {
  return protectedAction(
    'create',
    request,
    async ({ principal, grants, marketId }) => {
      const body = await request.json()
      if (!body || typeof body !== 'object' || Array.isArray(body))
        throw new z.ZodError([])
      return service.create(
        principal,
        grants,
        marketId,
        body,
        requestCorrelationId(request),
      )
    },
    true,
    201,
  )
}

export function getCustomer(request: Request, idValue: string) {
  return protectedAction('read', request, async ({ principal, grants, marketId }) =>
    service.get(
      principal,
      grants,
      marketId,
      positiveIdSchema.parse(idValue),
    ),
  )
}

export function updateCustomer(request: Request, idValue: string) {
  return protectedAction(
    'update',
    request,
    async ({ principal, grants, marketId }) =>
      service.update(
        principal,
        grants,
        marketId,
        positiveIdSchema.parse(idValue),
        await request.json(),
        requestCorrelationId(request),
      ),
    true,
  )
}

export function reassignCustomer(request: Request, idValue: string) {
  return protectedAction(
    'reassign',
    request,
    async ({ principal, grants, marketId }) =>
      service.reassign(
        principal,
        grants,
        marketId,
        positiveIdSchema.parse(idValue),
        await request.json(),
        requestCorrelationId(request),
      ),
    true,
  )
}

export function archiveCustomer(request: Request, idValue: string) {
  return protectedAction(
    'archive',
    request,
    async ({ principal, grants, marketId }) =>
      service.archive(
        principal,
        grants,
        marketId,
        positiveIdSchema.parse(idValue),
        await request.json(),
        requestCorrelationId(request),
      ),
    true,
  )
}

const duplicateQuerySchema = z.object({
  customerId: positiveIdSchema.optional(),
  identifiers: z.array(
    z.object({ kind: z.string().trim().min(1).max(60), value: z.string().trim().min(1).max(240) }).strict(),
  ).max(50),
}).strict()

export function duplicateCandidates(request: Request) {
  return protectedAction(
    'read',
    request,
    async ({ principal, grants, marketId }) => {
      const body = duplicateQuerySchema.parse(await request.json())
      return service.duplicateCandidates(principal, grants, {
        ...body,
        marketId,
      })
    },
    true,
  )
}

export const customerApiErrors = responseFor
