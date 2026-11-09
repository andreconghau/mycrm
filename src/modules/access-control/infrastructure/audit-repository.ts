import 'server-only'
import { and, desc, eq, gte, lte, lt, or, type SQL } from 'drizzle-orm'
import { getDatabase } from './database'
import { auditEvents } from './schema'
import {
  decodeAuditCursor,
  encodeAuditCursor,
  type AuditQuery,
} from '../application/audit-contracts'
import {
  projectSafeAuditDiff,
  projectSafeAuditReason,
} from '../application/audit-safe-diff'

export class AuditRepository {
  private readonly database = getDatabase()

  async list(query: AuditQuery) {
    const cursor = decodeAuditCursor(query.cursor)
    if (query.cursor && !cursor) throw new Error('Invalid audit cursor')
    const conditions: SQL[] = []
    if (query.actorId) conditions.push(eq(auditEvents.actorId, query.actorId))
    if (query.resourceType)
      conditions.push(eq(auditEvents.resourceType, query.resourceType))
    if (query.resourceId)
      conditions.push(eq(auditEvents.resourceId, query.resourceId))
    if (query.action) conditions.push(eq(auditEvents.action, query.action))
    if (query.from)
      conditions.push(gte(auditEvents.occurredAt, new Date(query.from)))
    if (query.to)
      conditions.push(lte(auditEvents.occurredAt, new Date(query.to)))
    if (cursor) {
      const time = new Date(cursor.occurredAt)
      conditions.push(
        or(
          lt(auditEvents.occurredAt, time),
          and(eq(auditEvents.occurredAt, time), lt(auditEvents.id, cursor.id)),
        )!,
      )
    }

    const rows = await this.database
      .select({
        id: auditEvents.id,
        actorId: auditEvents.actorId,
        action: auditEvents.action,
        resourceType: auditEvents.resourceType,
        resourceId: auditEvents.resourceId,
        resourceVersion: auditEvents.resourceVersion,
        requestId: auditEvents.requestId,
        reason: auditEvents.reason,
        safeDiff: auditEvents.safeDiff,
        result: auditEvents.result,
        occurredAt: auditEvents.occurredAt,
      })
      .from(auditEvents)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(auditEvents.occurredAt), desc(auditEvents.id))
      .limit(query.limit + 1)

    const hasMore = rows.length > query.limit
    const page = hasMore ? rows.slice(0, query.limit) : rows
    const last = page.at(-1)
    return {
      items: page.map((row) => ({
        ...row,
        reason: projectSafeAuditReason(row.reason),
        safeDiff: projectSafeAuditDiff(row.safeDiff),
      })),
      nextCursor:
        hasMore && last
          ? encodeAuditCursor({
              occurredAt: last.occurredAt.toISOString(),
              id: last.id,
            })
          : null,
    }
  }
}
