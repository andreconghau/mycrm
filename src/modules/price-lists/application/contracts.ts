import { z } from 'zod'
import { compare, fromString, isPositive } from '@/lib/decimal'
import { priceListStatuses } from '../domain/price-list-lifecycle'

const positiveId = z.number().int().positive().max(2_147_483_647)
const decimal = z.string().trim().regex(/^\d{1,18}(?:\.\d{1,6})?$/)
const positiveDecimal = decimal.refine((value) => isPositive(fromString(value)), 'Must be greater than zero')
const currency = z.enum(['USD', 'VND'])
const unit = z.enum(['KG', 'MT', 'CTN', 'PCS', 'LB'])
const priceBasis = z.enum(['NET', 'GROSS', 'OTHER'])
const shortText = (max: number) => z.string().trim().min(1).max(max)
const timestamp = z.string().datetime({ offset: true })

export const marketCodeSchema = z.string().trim().min(1).max(32).regex(/^[A-Za-z0-9_-]+$/)

const priceListFields = z.object({
  code: shortText(64),
  tier: z.enum(['CUSTOMER', 'MARKET', 'GENERAL']),
  customerId: positiveId.nullable().optional(),
  currency,
  validFrom: timestamp,
  validTo: timestamp.nullable().optional(),
}).strict()

export const createPriceListSchema = priceListFields.refine((value) => (value.tier === 'CUSTOMER') === (value.customerId != null), {
  message: 'Customer tier requires a customer, and other tiers cannot name one',
  path: ['customerId'],
}).refine((value) => !value.validTo || Date.parse(value.validTo) > Date.parse(value.validFrom), {
  message: 'validTo must be after validFrom', path: ['validTo'],
})

export const updatePriceListSchema = priceListFields.partial().extend({
  version: positiveId,
}).strict().refine((value) => Object.keys(value).length > 1, {
  message: 'At least one field is required',
}).superRefine((value, context) => {
  if (value.tier !== undefined && value.tier === 'CUSTOMER' && value.customerId === undefined) return
  if (value.tier !== undefined && value.tier !== 'CUSTOMER' && value.customerId != null) context.addIssue({ code: 'custom', path: ['customerId'], message: 'Only customer-tier lists can name a customer' })
  if (value.validFrom && value.validTo && Date.parse(value.validTo) <= Date.parse(value.validFrom)) context.addIssue({ code: 'custom', path: ['validTo'], message: 'validTo must be after validFrom' })
})

const priceListItemFields = z.object({
  productId: positiveId,
  specificationVersionId: positiveId.nullable().optional(),
  unit,
  priceBasis,
  priceBasisNote: z.string().trim().max(500).nullable().optional(),
  unitPrice: decimal,
  minQuantity: positiveDecimal.nullable().optional(),
  maxQuantity: positiveDecimal.nullable().optional(),
  validFrom: timestamp,
  validTo: timestamp.nullable().optional(),
}).strict()

export const createPriceListItemSchema = priceListItemFields.refine((value) => value.priceBasis !== 'OTHER' || Boolean(value.priceBasisNote?.trim()), {
  message: 'OTHER price basis requires a note', path: ['priceBasisNote'],
}).refine((value) => !value.minQuantity || !value.maxQuantity || compare(fromString(value.maxQuantity), fromString(value.minQuantity)) >= 0, {
  message: 'maxQuantity must be greater than or equal to minQuantity', path: ['maxQuantity'],
}).refine((value) => !value.validTo || Date.parse(value.validTo) > Date.parse(value.validFrom), {
  message: 'validTo must be after validFrom', path: ['validTo'],
})

export const updatePriceListItemSchema = priceListItemFields.partial().extend({ version: positiveId }).strict().refine((value) => !value.minQuantity || !value.maxQuantity || compare(fromString(value.maxQuantity), fromString(value.minQuantity)) >= 0, {
  message: 'maxQuantity must be greater than or equal to minQuantity', path: ['maxQuantity'],
}).refine((value) => !value.validTo || !value.validFrom || Date.parse(value.validTo) > Date.parse(value.validFrom), {
  message: 'validTo must be after validFrom', path: ['validTo'],
})

export const approvePriceListSchema = z.object({ version: positiveId }).strict()
export const archivePriceListSchema = z.object({
  version: positiveId,
  reason: z.string().trim().min(3).max(500),
}).strict()

const cursorPattern = (value: string) => {
  try {
    const decoded: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
    return !!decoded && typeof decoded === 'object' && 'createdAt' in decoded &&
      typeof decoded.createdAt === 'string' && !Number.isNaN(Date.parse(decoded.createdAt)) &&
      'id' in decoded && typeof decoded.id === 'number' && Number.isSafeInteger(decoded.id) && decoded.id > 0
  } catch {
    return false
  }
}

export function decodePriceListCursor(value: string) {
  if (!cursorPattern(value)) return undefined
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as { createdAt: string; id: number }
}

export const priceListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  tier: z.enum(['CUSTOMER', 'MARKET', 'GENERAL']).optional(),
  status: z.enum(priceListStatuses).optional(),
  effectiveState: z.enum(['SCHEDULED', 'ACTIVE', 'EXPIRED']).optional(),
  customerId: z.coerce.number().int().positive().optional(),
  currency: currency.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().max(512).refine(cursorPattern, 'Invalid cursor').optional(),
}).strict()

export const eligibilityQuerySchema = z.object({
  productId: z.coerce.number().int().positive(),
  specificationVersionId: z.coerce.number().int().positive().optional(),
  customerId: z.coerce.number().int().positive().optional(),
  quantity: positiveDecimal,
  unit,
  currency,
  priceBasis,
  at: timestamp.optional(),
}).strict()

export const createSelectionSchema = z.object({
  productId: positiveId,
  specificationVersionId: positiveId.nullable().optional(),
  priceListItemId: positiveId.nullable().optional(),
  selectedAmount: decimal,
  currency,
  unit,
  priceBasis,
  quantity: positiveDecimal,
  reason: z.string().trim().max(1000).nullable().optional(),
  priceBasisNote: z.string().trim().max(500).nullable().optional(),
  customerId: positiveId.nullable().optional(),
}).strict()

export const selectionHistoryQuerySchema = z.object({
  contextType: z.enum(['AD_HOC', 'QUOTATION_LINE']).optional(),
  contextId: z.coerce.number().int().positive().optional(),
  productId: z.coerce.number().int().positive().optional(),
  priceListId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).strict()
