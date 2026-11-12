import { z } from 'zod'
import { fromString, isNegative, isPositive } from '@/lib/decimal'

const positiveId = z.number().int().positive().max(2_147_483_647)
const decimalPattern = /^-?\d+(?:\.\d{1,18})?$/
const currency = z.enum(['USD', 'VND'])
const unit = z.enum(['KG', 'MT', 'CTN', 'PCS', 'LB'])
const priceBasis = z.enum(['NET', 'GROSS', 'OTHER'])

function decimalString(value: string) {
  if (!decimalPattern.test(value)) return false
  try {
    fromString(value)
    return true
  } catch {
    return false
  }
}

const decimal = z.string().trim().refine(decimalString, 'Enter a valid decimal with up to 18 fractional digits')
const nonNegativeDecimal = decimal.refine((value) => !isNegative(fromString(value)), 'Amount must be zero or greater')
const positiveDecimal = decimal.refine((value) => isPositive(fromString(value)), 'Value must be greater than zero')
const quotationFxRate = positiveDecimal.refine((value) => {
  const parsed = fromString(value)
  return parsed.scale <= 4 && parsed.units < BigInt(10) ** BigInt(14 + parsed.scale)
}, 'VND per USD must fit numeric(18,4)')
const timestamp = z.string().datetime({ offset: true })
const shortText = (max: number) => z.string().trim().min(1).max(max)

export const quotationQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  rfqId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).strict()

export const quotationRfqQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).strict()

export const createQuotationSchema = z.object({ rfqId: positiveId }).strict()

export const updateQuotationVersionSchema = z.object({
  version: positiveId,
  vndPerUsd: quotationFxRate.nullable().optional(),
  incoterm: z.string().trim().max(16).nullable().optional(),
  incotermPlace: z.string().trim().max(200).nullable().optional(),
  incotermYear: z.number().int().min(1900).max(2200).nullable().optional(),
  paymentTerms: z.string().trim().max(2000).nullable().optional(),
  validUntil: timestamp.nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 1, {
  message: 'At least one quotation version field is required',
})

const quotationLineFields = {
  rfqLineId: positiveId.nullable().optional(),
  productId: positiveId.nullable().optional(),
  specificationVersionId: positiveId.nullable().optional(),
  quantity: positiveDecimal.nullable().optional(),
  unit: unit.nullable().optional(),
  inputCurrency: currency.nullable().optional(),
  inputUnitPrice: nonNegativeDecimal.nullable().optional(),
  priceBasis: priceBasis.nullable().optional(),
  priceBasisNote: z.string().trim().max(500).nullable().optional(),
  priceListItemId: positiveId.nullable().optional(),
  priceReason: z.string().trim().max(1000).nullable().optional(),
}

export const createQuotationLineSchema = z.object({
  version: positiveId,
  ...quotationLineFields,
}).strict()

export const updateQuotationLineSchema = z.object({
  version: positiveId,
  ...quotationLineFields,
}).strict().refine((value) => Object.keys(value).length > 1, {
  message: 'At least one quotation line field is required',
})

export const setQuotationAdjustmentSchema = z.object({
  version: positiveId,
  amount: nonNegativeDecimal.nullable(),
  currency: currency.optional(),
}).strict().superRefine((value, context) => {
  if (value.amount !== null && !value.currency) {
    context.addIssue({ code: 'custom', path: ['currency'], message: 'Currency is required when an adjustment amount is set' })
  }
})

export const calculateQuotationSchema = z.object({ version: positiveId }).strict()

export const positiveQuotationIdSchema = positiveId
export const quotationCurrencySchema = currency
export const quotationUnitSchema = unit
export const quotationPriceBasisSchema = priceBasis
export const quotationShortTextSchema = shortText
