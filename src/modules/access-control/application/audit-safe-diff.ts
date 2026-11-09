import { roleCodes } from '../domain/types'

const booleanFields = new Set(['active', 'sessionsRevoked'])
const integerFields = new Set(['userId'])
const stringFields = new Set(['status', 'grantBoundary'])

export function projectSafeAuditDiff(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const source = value as Record<string, unknown>
  const safe: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(source)) {
    if (key === 'roleCode' && roleCodes.includes(item as never)) {
      safe[key] = item
    } else if (key === 'roles' && Array.isArray(item)) {
      const roles = item.filter((role) => roleCodes.includes(role as never))
      if (roles.length === item.length) safe[key] = roles
    } else if (booleanFields.has(key) && typeof item === 'boolean') {
      safe[key] = item
    } else if (
      integerFields.has(key) &&
      typeof item === 'number' &&
      Number.isSafeInteger(item) &&
      item > 0
    ) {
      safe[key] = item
    } else if (
      stringFields.has(key) &&
      typeof item === 'string' &&
      (key !== 'grantBoundary' || item === 'M29_ONLY') &&
      (key !== 'status' || item === 'DISABLED')
    ) {
      safe[key] = item
    }
  }
  return safe
}

export function projectSafeAuditReason(value: string | null) {
  if (!value) return null
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/(^|[^\w])\+?\d[\d ().-]{7,}\d\b/g, '$1[redacted-number]')
    .replace(
      /\b(?:bearer|token|password|secret)\s*[:=]?\s*\S+/gi,
      '[redacted-credential]',
    )
    .slice(0, 500)
}
