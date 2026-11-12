import { z } from 'zod'
import { authErrorResponse, requireCsrf, requirePermission } from '@/modules/access-control/application/request-auth'
import { requestCorrelationId } from '@/modules/access-control/application/request-correlation'
import { positiveIdSchema } from '@/modules/access-control/application/api-contracts'
import type { EffectiveGrant, Principal } from '@/modules/access-control/domain/types'
import { marketCodeSchema } from '../application/contracts'
import { PriceListService } from '../application/price-list-service'
import {
  PriceListBusinessRuleError,
  PriceListConflictError,
  PriceListImmutableError,
  PriceListNotFoundError,
} from '../infrastructure/price-list-repository'
import { PriceSelectionBusinessRuleError, PriceSelectionReasonError } from '../domain/price-list-selection'

const service = new PriceListService()

function errorResponse(error: unknown) {
  if (error instanceof PriceListNotFoundError) return Response.json({ error: { code: 'NOT_FOUND', message: 'Price List not found' } }, { status: 404 })
  if (error instanceof PriceListConflictError) return Response.json({ error: { code: 'VERSION_CONFLICT', message: 'Price List changed; reload and retry' } }, { status: 409 })
  if (error instanceof PriceListImmutableError) return Response.json({ error: { code: 'IMMUTABLE_RECORD', message: 'Only draft Price Lists may be edited' } }, { status: 409 })
  if (error instanceof PriceListBusinessRuleError || error instanceof PriceSelectionBusinessRuleError) return Response.json({ error: { code: 'BUSINESS_RULE_VIOLATION', message: error.message } }, { status: 409 })
  if (error instanceof PriceSelectionReasonError) return Response.json({ error: { code: 'VALIDATION_FAILED', message: error.message } }, { status: 422 })
  if (error instanceof z.ZodError) return Response.json({ error: { code: 'VALIDATION_FAILED', message: 'Request validation failed', issues: error.issues } }, { status: 400 })
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === '55000') return Response.json({ error: { code: 'IMMUTABLE_RECORD', message: 'Approved Price List items are immutable' } }, { status: 409 })
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') return Response.json({ error: { code: 'CONFLICT', message: 'A Price List value already exists' } }, { status: 409 })
  return authErrorResponse(error)
}

async function protectedAction<T>(
  action: string,
  request: Request,
  fn: (context: { principal: Principal; grants: EffectiveGrant[]; marketId: number }) => Promise<T>,
  mutation = false,
  successStatus = 200,
) {
  try {
    const { principal, grants } = await requirePermission('price_lists', action)
    if (mutation) await requireCsrf(request, principal.sessionId)
    const marketCode = marketCodeSchema.parse(new URL(request.url).searchParams.get('market'))
    const marketId = await service.resolveMarketId(principal, marketCode)
    const data = await fn({ principal, grants, marketId })
    return Response.json({ data }, { status: successStatus, headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return errorResponse(error)
  }
}

function query(request: Request) {
  const value: Record<string, string> = Object.fromEntries(new URL(request.url).searchParams.entries())
  delete value.market
  return value
}

async function body(request: Request) {
  const value: unknown = await request.json().catch(() => undefined)
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new z.ZodError([])
  return value
}

export function listPriceLists(request: Request) {
  return protectedAction('read', request, ({ principal, grants, marketId }) => service.list(principal, grants, query(request), marketId))
}

export function createPriceList(request: Request) {
  return protectedAction('create', request, async ({ principal, grants, marketId }) => service.create(principal, grants, marketId, await body(request), requestCorrelationId(request)), true, 201)
}

export function getPriceList(request: Request, idValue: string) {
  return protectedAction('read', request, ({ principal, grants, marketId }) => service.get(principal, grants, marketId, positiveIdSchema.parse(idValue)))
}

export function updatePriceList(request: Request, idValue: string) {
  return protectedAction('update', request, async ({ principal, grants, marketId }) => service.update(principal, grants, marketId, positiveIdSchema.parse(idValue), await body(request), requestCorrelationId(request)), true)
}

export function listPriceListItems(request: Request, idValue: string) {
  return protectedAction('read', request, async ({ principal, grants, marketId }) => {
    const record = await service.get(principal, grants, marketId, positiveIdSchema.parse(idValue))
    return { items: record.items ?? [] }
  })
}

export function createPriceListItem(request: Request, idValue: string) {
  return protectedAction('update', request, async ({ principal, grants, marketId }) => service.addItem(principal, grants, marketId, positiveIdSchema.parse(idValue), await body(request), requestCorrelationId(request)), true, 201)
}

export function updatePriceListItem(request: Request, idValue: string, itemIdValue: string) {
  return protectedAction('update', request, async ({ principal, grants, marketId }) => service.updateItem(principal, grants, marketId, positiveIdSchema.parse(idValue), positiveIdSchema.parse(itemIdValue), await body(request), requestCorrelationId(request)), true)
}

export function approvePriceList(request: Request, idValue: string) {
  return protectedAction('approve', request, async ({ principal, grants, marketId }) => service.approve(principal, grants, marketId, positiveIdSchema.parse(idValue), await body(request), requestCorrelationId(request)), true)
}

export function archivePriceList(request: Request, idValue: string) {
  return protectedAction('archive', request, async ({ principal, grants, marketId }) => service.archive(principal, grants, marketId, positiveIdSchema.parse(idValue), await body(request), requestCorrelationId(request)), true)
}

export function applicablePrices(request: Request) {
  return protectedAction('read', request, ({ principal, grants, marketId }) => service.eligible(principal, grants, marketId, query(request)))
}

export function recordPriceSelection(request: Request) {
  return protectedAction('select', request, async ({ principal, grants, marketId }) => service.recordSelection(principal, grants, marketId, await body(request), requestCorrelationId(request)), true, 201)
}

export function listPriceSelections(request: Request) {
  return protectedAction('read', request, ({ principal, grants, marketId }) => service.history(principal, grants, marketId, query(request)))
}
