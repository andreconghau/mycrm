import { z } from 'zod'

const positiveId = z.number().int().positive().max(2_147_483_647)
const countryCode = z.string().trim().regex(/^[A-Za-z]{2}$/).transform((v) => v.toUpperCase())
const currencyCode = z.string().trim().regex(/^[A-Za-z]{3}$/).transform((v) => v.toUpperCase())
export const customerMarketCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{2,32}$/)
  .transform((value) => value.toUpperCase())

export const customerStatuses = [
  'PROSPECT',
  'ACTIVE',
  'ON_HOLD',
  'INACTIVE',
  'ARCHIVED',
] as const

const addressInput = z.object({
  id: positiveId.optional(),
  kind: z.enum(['billing', 'shipping', 'office']),
  addressLines: z.string().trim().min(1).max(1000),
  city: z.string().trim().max(120).nullable().optional(),
  region: z.string().trim().max(120).nullable().optional(),
  postalCode: z.string().trim().max(32).nullable().optional(),
  countryCode,
  isDefault: z.boolean().default(false),
}).strict()

const identifierInput = z.object({
  id: positiveId.optional(),
  kind: z.string().trim().min(1).max(60),
  value: z.string().trim().min(1).max(240),
  issuingCountry: countryCode.nullable().optional(),
}).strict()

const customerFields = {
  code: z.string().trim().min(1).max(40),
  legalName: z.string().trim().min(1).max(240),
  tradeName: z.string().trim().max(240).nullable().optional(),
  countryCode,
  preferredLanguage: z.string().trim().min(2).max(16).nullable().optional(),
  preferredCurrency: currencyCode.nullable().optional(),
  website: z.string().trim().url().max(500).nullable().optional(),
  addresses: z.array(addressInput).max(50).default([]),
  identifiers: z.array(identifierInput).max(50).default([]),
}

export const createCustomerSchema = z.object({
  ...customerFields,
  status: z.literal('PROSPECT').default('PROSPECT'),
  ownerId: positiveId.optional(),
  teamId: positiveId.nullable().optional(),
}).strict()

export const updateCustomerSchema = z.object({
  version: positiveId,
  legalName: z.string().trim().min(1).max(240).optional(),
  tradeName: z.string().trim().max(240).nullable().optional(),
  countryCode: countryCode.optional(),
  preferredLanguage: z.string().trim().min(2).max(16).nullable().optional(),
  preferredCurrency: currencyCode.nullable().optional(),
  website: z.string().trim().url().max(500).nullable().optional(),
  status: z.enum(customerStatuses).optional(),
  addresses: z.array(addressInput).max(50).optional(),
  identifiers: z.array(identifierInput).max(50).optional(),
}).strict().refine((value) => Object.keys(value).length > 1, {
  message: 'At least one customer field is required',
})

export const reassignCustomerSchema = z.object({
  version: positiveId,
  ownerId: positiveId,
  teamId: positiveId.nullable().optional(),
  reason: z.string().trim().min(3).max(500),
}).strict()

export const archiveCustomerSchema = z.object({
  version: positiveId,
  reason: z.string().trim().min(3).max(500),
}).strict()

export const customerListQuerySchema = z.object({
  marketCode: customerMarketCodeSchema,
  q: z.string().trim().max(120).optional(),
  country: countryCode.optional(),
  status: z.enum(customerStatuses).optional(),
  owner: positiveId.optional(),
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
  }, 'Invalid customer cursor').optional(),
}).strict()

export function normalizeIdentifier(value: string) {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleUpperCase('en-US')
}

export function canTransitionCustomer(from: string, to: string) {
  const transitions: Record<string, string[]> = {
    PROSPECT: ['ACTIVE', 'ON_HOLD', 'INACTIVE', 'ARCHIVED'],
    ACTIVE: ['ON_HOLD', 'INACTIVE', 'ARCHIVED'],
    ON_HOLD: ['ACTIVE', 'INACTIVE', 'ARCHIVED'],
    INACTIVE: ['ACTIVE', 'ARCHIVED'],
    ARCHIVED: [],
  }
  return from === to || (transitions[from]?.includes(to) ?? false)
}

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>
export type ReassignCustomerInput = z.infer<typeof reassignCustomerSchema>
