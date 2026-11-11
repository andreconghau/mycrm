import { z } from 'zod'

const positiveId = z.number().int().positive().max(2_147_483_647)

export const productUnits = ['KG', 'MT', 'CTN', 'PCS', 'LB'] as const
export const productStatuses = ['DRAFT', 'ACTIVE', 'INACTIVE'] as const
export const productLocales = ['en', 'vi', 'ko'] as const

export const productSkuSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{2,40}$/, 'SKU must be 2-40 characters of letters, digits, _ or -')
  .transform((value) => value.toUpperCase())

const aliasInput = z.object({
  locale: z.string().trim().min(2).max(16),
  label: z.string().trim().min(1).max(240),
}).strict()

const namesInput = z.object({
  en: z.string().trim().min(1).max(240),
  vi: z.string().trim().min(1).max(240),
  ko: z.string().trim().min(1).max(240),
}).strict()

const productFields = {
  category: z.string().trim().min(1).max(120).nullable().optional(),
  speciesCommonName: z.string().trim().min(1).max(200).nullable().optional(),
  speciesScientificName: z.string().trim().min(1).max(200).nullable().optional(),
  productFamily: z.string().trim().min(1).max(120).nullable().optional(),
  defaultUnit: z.enum(productUnits),
  descriptionEn: z.string().trim().min(1).max(4000).nullable().optional(),
  descriptionVi: z.string().trim().min(1).max(4000).nullable().optional(),
  descriptionKo: z.string().trim().min(1).max(4000).nullable().optional(),
  aliases: z.array(aliasInput).max(50).default([]),
}

export const createProductSchema = z.object({
  sku: productSkuSchema,
  names: namesInput,
  ...productFields,
}).strict()

export const updateProductSchema = z.object({
  version: positiveId,
  names: namesInput.partial().optional(),
  category: productFields.category,
  speciesCommonName: productFields.speciesCommonName,
  speciesScientificName: productFields.speciesScientificName,
  productFamily: productFields.productFamily,
  defaultUnit: productFields.defaultUnit.optional(),
  descriptionEn: productFields.descriptionEn,
  descriptionVi: productFields.descriptionVi,
  descriptionKo: productFields.descriptionKo,
  aliases: z.array(aliasInput).max(50).optional(),
}).strict().refine((value) => Object.keys(value).length > 1, {
  message: 'At least one product field is required',
})

export const transitionProductSchema = z.object({
  version: positiveId,
  reason: z.string().trim().min(3).max(500).optional(),
}).strict()

export const productListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(120).optional(),
  status: z.enum(productStatuses).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().max(512).refine((value) => {
    try {
      const decoded: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
      if (!decoded || typeof decoded !== 'object') return false
      const cursor = decoded as { createdAt?: unknown; id?: unknown }
      return (
        typeof cursor.createdAt === 'string' &&
        !Number.isNaN(Date.parse(cursor.createdAt)) &&
        typeof cursor.id === 'number' &&
        Number.isSafeInteger(cursor.id) &&
        cursor.id > 0
      )
    } catch {
      return false
    }
  }, 'Invalid product cursor').optional(),
}).strict()

export function decodeProductCursor(value: string) {
  try {
    const decoded: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
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

const productTransitions: Record<string, string[]> = {
  DRAFT: ['ACTIVE'],
  ACTIVE: ['INACTIVE'],
  INACTIVE: ['ACTIVE'],
}

export function canTransitionProduct(from: string, to: string) {
  return productTransitions[from]?.includes(to) ?? false
}

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type TransitionProductInput = z.infer<typeof transitionProductSchema>
