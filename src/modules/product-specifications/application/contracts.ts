import { z } from 'zod'
import {
  measurementUnits,
  weightUnits,
} from '../domain/specification-measurements'
import { specificationRevisionStatuses } from '../domain/specification-lifecycle'

const positiveId = z.number().int().positive().max(2_147_483_647)

/**
 * Decimal values travel as strings so no precision is lost crossing the HTTP
 * and JSON boundaries. `src/lib/decimal.ts` is the only thing that interprets
 * them; Zod only checks the shape here.
 */
const decimalString = z
  .string()
  .trim()
  .regex(/^-?\d{1,18}(?:\.\d{1,6})?$/, 'Must be a plain decimal value')

const positiveDecimalString = z
  .string()
  .trim()
  .regex(/^\d{1,18}(?:\.\d{1,6})?$/, 'Must be a non-negative decimal value')

const shortText = (max: number) => z.string().trim().min(1).max(max)

const localeText = shortText(240).nullable().optional()
const longText = z.string().trim().min(1).max(4000).nullable().optional()

const revisionContentFields = {
  nameEn: localeText,
  nameVi: localeText,
  nameKo: localeText,
  descriptionEn: longText,
  descriptionVi: longText,
  descriptionKo: longText,

  grade: shortText(120).nullable().optional(),
  processing: shortText(200).nullable().optional(),
  treatment: shortText(200).nullable().optional(),
  frozenForm: shortText(120).nullable().optional(),
  sizeBand: shortText(120).nullable().optional(),
  sizeUnit: shortText(32).nullable().optional(),

  netWeightPerPack: positiveDecimalString.nullable().optional(),
  grossWeightPerPack: positiveDecimalString.nullable().optional(),
  weightUnit: z.enum(weightUnits).nullable().optional(),
  packsPerCarton: z.number().int().positive().max(1_000_000).nullable().optional(),
  cartonNetWeight: positiveDecimalString.nullable().optional(),
  glazingPercent: positiveDecimalString.nullable().optional(),
  packaging: shortText(200).nullable().optional(),
  packagingMaterial: shortText(200).nullable().optional(),
  uom: z.enum(measurementUnits).nullable().optional(),
  moq: positiveDecimalString.nullable().optional(),
  moqUnit: z.enum(measurementUnits).nullable().optional(),

  // A plausibility range only; no default freezing temperature is implied.
  storageTempC: decimalString.nullable().optional(),
  shelfLifeMonths: z.number().int().positive().max(600).nullable().optional(),
  originCountry: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, 'Must be an ISO 3166-1 alpha-2 country code')
    .transform((value) => value.toUpperCase())
    .nullable()
    .optional(),
  certifications: z.array(shortText(120)).max(50).nullable().optional(),
  labelLanguages: z.array(shortText(16)).max(20).nullable().optional(),

  buyerRequirements: longText,
  notes: longText,
  requirements: z.record(z.string(), z.unknown()).nullable().optional(),
}

export const createSpecificationSchema = z
  .object({
    /** NULL/absent = standard specification; set = buyer-specific. */
    customerId: positiveId.nullable().optional(),
    ...revisionContentFields,
  })
  .strict()

export const updateRevisionSchema = z
  .object({
    version: positiveId,
    ...revisionContentFields,
  })
  .strict()
  .refine((value) => Object.keys(value).length > 1, {
    message: 'At least one specification field is required',
  })

/** Creates the next DRAFT revision, cloning an existing revision's content. */
export const createRevisionSchema = z
  .object({
    version: positiveId,
    sourceRevisionNo: z.number().int().positive().max(1_000_000).optional(),
    ...revisionContentFields,
  })
  .strict()

export const approveRevisionSchema = z
  .object({
    version: positiveId,
    reason: z.string().trim().min(3).max(500).optional(),
  })
  .strict()

export const archiveSpecificationSchema = z
  .object({
    version: positiveId,
    reason: z.string().trim().min(3).max(500).optional(),
  })
  .strict()

export const marketCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .regex(/^[A-Za-z0-9_-]{1,32}$/, 'Invalid market code')

function isValidCursor(value: string) {
  try {
    const decoded: unknown = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    )
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
}

export function decodeSpecificationCursor(value: string) {
  if (!isValidCursor(value)) return undefined
  const cursor = JSON.parse(
    Buffer.from(value, 'base64url').toString('utf8'),
  ) as { createdAt: string; id: number }
  return { createdAt: cursor.createdAt, id: cursor.id }
}

export const specificationListQuerySchema = z
  .object({
    q: z.string().trim().max(120).optional(),
    productId: z.coerce.number().int().positive().max(2_147_483_647).optional(),
    customerId: z.coerce.number().int().positive().max(2_147_483_647).optional(),
    status: z.enum(specificationRevisionStatuses).optional(),
    /** 'STANDARD' = customer_id IS NULL, 'BUYER' = customer_id IS NOT NULL. */
    kind: z.enum(['STANDARD', 'BUYER']).optional(),
    active: z.enum(['true', 'false']).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().max(512).refine(isValidCursor, 'Invalid cursor').optional(),
  })
  .strict()

export const revisionCompareQuerySchema = z
  .object({
    left: z.coerce.number().int().positive().max(1_000_000),
    right: z.coerce.number().int().positive().max(1_000_000),
  })
  .strict()

export type CreateSpecificationInput = z.infer<typeof createSpecificationSchema>
export type UpdateRevisionInput = z.infer<typeof updateRevisionSchema>
export type CreateRevisionInput = z.infer<typeof createRevisionSchema>
export type ApproveRevisionInput = z.infer<typeof approveRevisionSchema>
export type SpecificationListQuery = z.infer<
  typeof specificationListQuerySchema
>

/** Field list used by the side-by-side revision comparison. */
export const comparableRevisionFields = Object.keys(
  revisionContentFields,
) as Array<keyof typeof revisionContentFields>
