import { z } from 'zod'

const positiveId = z.coerce.number().int().positive().max(2_147_483_647)
const dateTime = z.iso.datetime({ offset: true })

export const auditQuerySchema = z
  .object({
    actorId: positiveId.optional(),
    resourceType: z.string().trim().min(1).max(80).optional(),
    resourceId: positiveId.optional(),
    action: z.string().trim().min(1).max(120).optional(),
    from: dateTime.optional(),
    to: dateTime.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().max(512).optional(),
  })
  .strict()
  .refine(
    (value) => !value.cursor || Boolean(decodeAuditCursor(value.cursor)),
    {
      path: ['cursor'],
      message: 'Invalid audit cursor',
    },
  )
  .refine(
    (value) =>
      !value.from ||
      !value.to ||
      Date.parse(value.from) <= Date.parse(value.to),
    { path: ['to'], message: 'to must be on or after from' },
  )

export type AuditQuery = z.infer<typeof auditQuerySchema>

export type AuditCursor = { occurredAt: string; id: number }

export function encodeAuditCursor(cursor: AuditCursor) {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

export function decodeAuditCursor(
  value: string | undefined,
): AuditCursor | null {
  if (!value) return null
  try {
    const decoded: unknown = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    )
    const parsed = z
      .object({ occurredAt: dateTime, id: positiveId })
      .strict()
      .safeParse(decoded)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
