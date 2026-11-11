import { z } from 'zod'
import {
  authErrorResponse,
  requireCsrf,
  requirePermission,
} from '@/modules/access-control/application/request-auth'
import { requestCorrelationId } from '@/modules/access-control/application/request-correlation'
import { positiveIdSchema } from '@/modules/access-control/application/api-contracts'
import type { EffectiveGrant, Principal } from '@/modules/access-control/domain/types'
import {
  ProductConflictError,
  ProductNotFoundError,
} from '../infrastructure/product-repository'
import { ProductService } from '../application/product-service'

const service = new ProductService()

function postgresErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  if ('code' in error && typeof error.code === 'string') return error.code
  if ('cause' in error) return postgresErrorCode(error.cause)
  return undefined
}

function responseFor(error: unknown) {
  if (error instanceof ProductNotFoundError) {
    return Response.json(
      { error: { code: 'NOT_FOUND', message: 'Product not found' } },
      { status: 404 },
    )
  }
  if (error instanceof ProductConflictError) {
    return Response.json(
      { error: { code: 'VERSION_CONFLICT', message: error.message } },
      { status: 409 },
    )
  }
  if (postgresErrorCode(error) === '23505') {
    return Response.json(
      { error: { code: 'CONFLICT', message: 'A conflicting product value already exists' } },
      { status: 409 },
    )
  }
  if (error instanceof Error && error.message === 'INVALID_PRODUCT_TRANSITION') {
    return Response.json(
      {
        error: {
          code: 'BUSINESS_RULE_VIOLATION',
          message: 'Product status transition is invalid',
        },
      },
      { status: 409 },
    )
  }
  return authErrorResponse(error)
}

async function protectedAction<T>(
  action: string,
  request: Request,
  fn: (context: { principal: Principal; grants: EffectiveGrant[] }) => Promise<T>,
  requireMutationCsrf = false,
  successStatus = 200,
) {
  try {
    const { principal, grants } = await requirePermission('products', action)
    if (requireMutationCsrf) await requireCsrf(request, principal.sessionId)
    const data = await fn({ principal, grants })
    return Response.json(
      { data },
      { status: successStatus, headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (error) {
    return responseFor(error)
  }
}

export function listProducts(request: Request) {
  return protectedAction('read', request, async ({ principal, grants }) => {
    const params = new URL(request.url).searchParams
    const query: Record<string, string> = Object.fromEntries(params.entries())
    return service.list(principal, grants, query)
  })
}

export function createProduct(request: Request) {
  return protectedAction(
    'create',
    request,
    async ({ principal, grants }) => {
      const body = await request.json()
      if (!body || typeof body !== 'object' || Array.isArray(body))
        throw new z.ZodError([])
      return service.create(principal, grants, body, requestCorrelationId(request))
    },
    true,
    201,
  )
}

export function getProduct(request: Request, idValue: string) {
  return protectedAction('read', request, async ({ principal, grants }) =>
    service.get(principal, grants, positiveIdSchema.parse(idValue)),
  )
}

export function updateProduct(request: Request, idValue: string) {
  return protectedAction(
    'update',
    request,
    async ({ principal, grants }) =>
      service.update(
        principal,
        grants,
        positiveIdSchema.parse(idValue),
        await request.json(),
        requestCorrelationId(request),
      ),
    true,
  )
}

export function approveProduct(request: Request, idValue: string) {
  return protectedAction(
    'approve',
    request,
    async ({ principal, grants }) =>
      service.approve(
        principal,
        grants,
        positiveIdSchema.parse(idValue),
        await request.json().catch(() => ({})),
        requestCorrelationId(request),
      ),
    true,
  )
}

export function retireProduct(request: Request, idValue: string) {
  return protectedAction(
    'retire',
    request,
    async ({ principal, grants }) =>
      service.retire(
        principal,
        grants,
        positiveIdSchema.parse(idValue),
        await request.json().catch(() => ({})),
        requestCorrelationId(request),
      ),
    true,
  )
}

export function reactivateProduct(request: Request, idValue: string) {
  return protectedAction(
    'approve',
    request,
    async ({ principal, grants }) =>
      service.reactivate(
        principal,
        grants,
        positiveIdSchema.parse(idValue),
        await request.json().catch(() => ({})),
        requestCorrelationId(request),
      ),
    true,
  )
}

export const productApiErrors = responseFor
