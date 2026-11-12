import { z } from 'zod'
import { authErrorResponse, requireCsrf, requirePermission } from '@/modules/access-control/application/request-auth'
import { requestCorrelationId } from '@/modules/access-control/application/request-correlation'
import { positiveIdSchema } from '@/modules/access-control/application/api-contracts'
import type { EffectiveGrant, Principal } from '@/modules/access-control/domain/types'
import { marketCodeSchema } from '@/modules/price-lists/application/contracts'
import { QuotationService } from '../application/quotation-service'
import {
  QuotationBusinessRuleError,
  QuotationConflictError,
  QuotationImmutableError,
  QuotationNotFoundError,
} from '../infrastructure/quotation-repository'
import { QuotationCalculationError } from '../domain/quotation-calculation'
import { PriceSelectionBusinessRuleError, PriceSelectionReasonError } from '@/modules/price-lists/domain/price-list-selection'
import { PriceListBusinessRuleError } from '@/modules/price-lists/infrastructure/price-list-repository'

const service = new QuotationService()

function errorResponse(error: unknown) {
  if (error instanceof QuotationNotFoundError) return Response.json({ error: { code: 'NOT_FOUND', message: 'Quotation not found' } }, { status: 404 })
  if (error instanceof QuotationConflictError) return Response.json({ error: { code: 'VERSION_CONFLICT', message: error.message } }, { status: 409 })
  if (error instanceof QuotationImmutableError) return Response.json({ error: { code: 'IMMUTABLE_RECORD', message: error.message } }, { status: 409 })
  if (error instanceof QuotationBusinessRuleError) return Response.json({ error: { code: 'BUSINESS_RULE_VIOLATION', message: error.message } }, { status: 422 })
  if (error instanceof PriceListBusinessRuleError || error instanceof PriceSelectionBusinessRuleError) return Response.json({ error: { code: 'BUSINESS_RULE_VIOLATION', message: error.message } }, { status: 422 })
  if (error instanceof PriceSelectionReasonError) return Response.json({ error: { code: 'VALIDATION_FAILED', message: error.message } }, { status: 422 })
  if (error instanceof QuotationCalculationError) return Response.json({ error: { code: 'VALIDATION_FAILED', message: error.message } }, { status: 422 })
  if (error instanceof z.ZodError) return Response.json({ error: { code: 'VALIDATION_FAILED', message: 'Request validation failed', issues: error.issues } }, { status: 400 })
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') return Response.json({ error: { code: 'CONFLICT', message: 'A conflicting quotation revision or line already exists' } }, { status: 409 })
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === '55000') return Response.json({ error: { code: 'IMMUTABLE_RECORD', message: 'Only draft quotation revisions may be changed' } }, { status: 409 })
  return authErrorResponse(error)
}

async function protectedAction<T>(action: string, request: Request, fn: (context: { principal: Principal; grants: EffectiveGrant[]; marketId: number }) => Promise<T>, mutation = false, successStatus = 200) {
  try {
    const { principal, grants } = await requirePermission('quotations', action)
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
  delete value.resource
  return value
}

async function body(request: Request) {
  const value: unknown = await request.json().catch(() => undefined)
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new z.ZodError([])
  return value
}

export function listQuotations(request: Request) {
  return protectedAction('read', request, ({ principal, grants, marketId }) => service.list(principal, grants, marketId, query(request)))
}

export function listQuotationRfqOptions(request: Request) {
  return protectedAction('create', request, ({ principal, grants, marketId }) => service.rfqOptions(principal, grants, marketId, query(request)))
}

export function createQuotation(request: Request) {
  return protectedAction('create', request, async ({ principal, grants, marketId }) => service.create(principal, grants, marketId, await body(request), requestCorrelationId(request)), true, 201)
}

export function getQuotation(request: Request, idValue: string) {
  return protectedAction('read', request, ({ principal, grants, marketId }) => service.get(principal, grants, marketId, positiveIdSchema.parse(idValue)))
}

export function cloneQuotationRevision(request: Request, idValue: string) {
  return protectedAction('edit', request, async ({ principal, grants, marketId }) => service.clone(principal, grants, marketId, positiveIdSchema.parse(idValue), await body(request), requestCorrelationId(request)), true, 201)
}

export function updateQuotationVersion(request: Request, idValue: string) {
  return protectedAction('edit', request, async ({ principal, grants, marketId }) => service.updateVersion(principal, grants, marketId, positiveIdSchema.parse(idValue), await body(request), requestCorrelationId(request)), true)
}

export function createQuotationLine(request: Request, idValue: string) {
  return protectedAction('edit', request, async ({ principal, grants, marketId }) => service.createLine(principal, grants, marketId, positiveIdSchema.parse(idValue), await body(request), requestCorrelationId(request)), true, 201)
}

export function updateQuotationLine(request: Request, versionValue: string, lineValue: string) {
  return protectedAction('edit', request, async ({ principal, grants, marketId }) => service.updateLine(principal, grants, marketId, positiveIdSchema.parse(versionValue), positiveIdSchema.parse(lineValue), await body(request), requestCorrelationId(request)), true)
}

export function setQuotationAdjustment(request: Request, idValue: string, kind: 'FREIGHT' | 'INSURANCE') {
  return protectedAction('edit', request, async ({ principal, grants, marketId }) => service.setAdjustment(principal, grants, marketId, positiveIdSchema.parse(idValue), kind, await body(request), requestCorrelationId(request)), true)
}

export function calculateQuotation(request: Request, idValue: string) {
  return protectedAction('edit', request, async ({ principal, grants, marketId }) => service.calculate(principal, grants, marketId, positiveIdSchema.parse(idValue), await body(request), requestCorrelationId(request)), true)
}

export function checkQuotationReadiness(request: Request, idValue: string) {
  return protectedAction('read', request, ({ principal, grants, marketId }) => service.readiness(principal, grants, marketId, positiveIdSchema.parse(idValue)))
}
