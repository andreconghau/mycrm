import { z } from 'zod'
import { customerMarketCodeSchema } from '@/modules/customers/application/contracts'

export { customerMarketCodeSchema as contactMarketCodeSchema }

const positiveId = z.number().int().positive().max(2_147_483_647)

/** ISO-8601 instant with an explicit offset; stored as a UTC timestamp. */
const recordedInstant = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value))

export const contactChannelKinds = [
  'email',
  'phone',
  'whatsapp',
  'kakao',
  'line',
  'other',
] as const
export type ContactChannelKind = (typeof contactChannelKinds)[number]

export const contactPrimaryContexts = [
  'procurement',
  'invoicing',
  'consignee',
] as const

export const contactPreferencePurposes = [
  'commercial',
  'operational',
  'marketing',
] as const

const supportedTimezones = new Set<string>(
  typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('timeZone')
    : [],
)

const preferredLanguage = z
  .string()
  .trim()
  .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Unsupported language tag')

const timezone = z
  .string()
  .trim()
  .max(64)
  .refine(
    (value) => supportedTimezones.size === 0 || supportedTimezones.has(value),
    'Unsupported IANA timezone',
  )

/**
 * Normalizes an email handle for duplicate *hinting* only. NFKC, trim and
 * lowercase. No dot stripping and no `+tag` removal: those infer identity and
 * would collapse two real people at the same buyer.
 */
export function normalizeEmailHandle(value: string) {
  return value.normalize('NFKC').trim().toLocaleLowerCase('en-US')
}

export function normalizePhoneHandle(value: string) {
  const normalized = value.normalize('NFKC').trim()
  const digits = normalized.replace(/[^\d]/g, '')
  return normalized.startsWith('+') ? `+${digits}` : digits
}

export function normalizeChannelHandle(kind: string, value: string) {
  if (kind === 'email') return normalizeEmailHandle(value)
  if (kind === 'phone' || kind === 'whatsapp') return normalizePhoneHandle(value)
  return value.normalize('NFKC').trim().toLocaleLowerCase('en-US')
}

const emailHandle = z
  .string()
  .trim()
  .min(3)
  .max(320)
  .refine(
    (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    'Invalid email handle',
  )

const genericHandle = z.string().trim().min(1).max(240)

export const channelInputSchema = z
  .object({
    kind: z.enum(contactChannelKinds),
    handle: genericHandle,
    isPrimary: z.boolean().default(false),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.kind !== 'email') return
    if (!emailHandle.safeParse(value.handle).success) {
      context.addIssue({
        code: 'custom',
        path: ['handle'],
        message: 'Invalid email handle',
      })
    }
  })

export const updateChannelSchema = z
  .object({
    version: positiveId,
    kind: z.enum(contactChannelKinds).optional(),
    handle: genericHandle.optional(),
    isPrimary: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 1, {
    message: 'At least one channel field is required',
  })

export const preferenceInputSchema = z
  .object({
    purpose: z.enum(contactPreferencePurposes),
    allowed: z.boolean().default(false),
    evidenceFileId: positiveId.nullable().optional(),
    recordedAt: recordedInstant,
  })
  .strict()

export const updatePreferenceSchema = z
  .object({
    version: positiveId,
    purpose: z.enum(contactPreferencePurposes).optional(),
    allowed: z.boolean().optional(),
    evidenceFileId: positiveId.nullable().optional(),
    recordedAt: recordedInstant.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 1, {
    message: 'At least one preference field is required',
  })

const contactFields = {
  displayName: z.string().trim().min(1).max(240),
  jobTitle: z.string().trim().max(240).nullable().optional(),
  department: z.string().trim().max(240).nullable().optional(),
  preferredLanguage: preferredLanguage.nullable().optional(),
  timezone: timezone.nullable().optional(),
}

export const createContactSchema = z
  .object({
    customerId: positiveId,
    ...contactFields,
    channels: z.array(channelInputSchema).max(20).default([]),
  })
  .strict()

/**
 * `customerId` and `marketId` are intentionally absent: a client may never move
 * a contact to another buyer through a generic patch. The only move path is the
 * explicit transfer command, which authorizes both source and destination.
 */
export const updateContactSchema = z
  .object({
    version: positiveId,
    displayName: z.string().trim().min(1).max(240).optional(),
    jobTitle: z.string().trim().max(240).nullable().optional(),
    department: z.string().trim().max(240).nullable().optional(),
    preferredLanguage: preferredLanguage.nullable().optional(),
    timezone: timezone.nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 1, {
    message: 'At least one contact field is required',
  })

export const setPrimaryContactSchema = z
  .object({
    version: positiveId,
    context: z.enum(contactPrimaryContexts),
  })
  .strict()

export const deactivateContactSchema = z
  .object({
    version: positiveId,
    reason: z.string().trim().min(3).max(500),
  })
  .strict()

export const transferContactSchema = z
  .object({
    version: positiveId,
    targetCustomerId: positiveId,
    reason: z.string().trim().min(3).max(500),
  })
  .strict()

export const contactDuplicateCandidatesSchema = z
  .object({
    contactId: positiveId.optional(),
    customerId: positiveId.optional(),
    channels: z
      .array(
        z
          .object({
            kind: z.enum(contactChannelKinds),
            handle: genericHandle,
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict()

const cursorSchema = z
  .string()
  .max(512)
  .refine((value) => decodeContactCursor(value) !== undefined, 'Invalid contact cursor')

export const contactListQuerySchema = z
  .object({
    marketCode: customerMarketCodeSchema,
    customerId: z.coerce.number().int().positive().optional(),
    active: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
    q: z.string().trim().max(120).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: cursorSchema.optional(),
  })
  .strict()

export const contactTimelineQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z
      .string()
      .max(512)
      .refine(
        (value) => decodeContactCursor(value, 'occurredAt') !== undefined,
        'Invalid timeline cursor',
      )
      .optional(),
  })
  .strict()

export function decodeContactCursor(
  value: string,
  timestampKey: 'createdAt' | 'occurredAt' = 'createdAt',
) {
  try {
    const decoded: unknown = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    )
    if (!decoded || typeof decoded !== 'object') return undefined
    const cursor = decoded as Record<string, unknown>
    const timestamp = cursor[timestampKey]
    if (
      typeof timestamp !== 'string' ||
      Number.isNaN(Date.parse(timestamp)) ||
      typeof cursor.id !== 'number' ||
      !Number.isSafeInteger(cursor.id) ||
      cursor.id < 1
    ) {
      return undefined
    }
    return { timestamp, id: cursor.id }
  } catch {
    return undefined
  }
}

export function encodeContactCursor(
  timestamp: Date,
  id: number,
  timestampKey: 'createdAt' | 'occurredAt' = 'createdAt',
) {
  return Buffer.from(
    JSON.stringify({ [timestampKey]: timestamp.toISOString(), id }),
  ).toString('base64url')
}

export type CreateContactInput = z.infer<typeof createContactSchema>
export type UpdateContactInput = z.infer<typeof updateContactSchema>
export type ChannelInput = z.infer<typeof channelInputSchema>
export type PreferenceInput = z.infer<typeof preferenceInputSchema>
export type TransferContactInput = z.infer<typeof transferContactSchema>
