import { roleCodes } from '../domain/types'

const booleanFields = new Set(['active', 'sessionsRevoked'])
const integerFields = new Set([
  'userId',
  'ownerId',
  'teamId',
  'previousContactId',
  'formerCustomerId',
  'newCustomerId',
])
const stringFields = new Set([
  'status',
  'grantBoundary',
  'customerStatus',
  'marketCode',
  'defaultCurrency',
])
const customerStatuses = new Set([
  'PROSPECT',
  'ACTIVE',
  'ON_HOLD',
  'INACTIVE',
  'ARCHIVED',
])
const customerAuditFields = new Set([
  'code',
  'legalName',
  'tradeName',
  'countryCode',
  'preferredLanguage',
  'preferredCurrency',
  'status',
  'ownerId',
  'teamId',
  'addresses',
  'identifiers',
])

const contactAuditFields = new Set([
  'displayName',
  'jobTitle',
  'department',
  'preferredLanguage',
  'timezone',
  'active',
  'context',
  'previousContactId',
  'channelKind',
  'preferencePurpose',
  'allowed',
  'formerCustomerId',
  'newCustomerId',
])

const contactPrimaryContexts = new Set([
  'procurement',
  'invoicing',
  'consignee',
])
const contactChannelKinds = new Set([
  'email',
  'phone',
  'whatsapp',
  'kakao',
  'line',
  'other',
])
const contactPreferencePurposes = new Set([
  'commercial',
  'operational',
  'marketing',
])

export function projectSafeAuditDiff(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const source = value as Record<string, unknown>
  const safe: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(source)) {
    if (key === 'roleCode' && roleCodes.includes(item as never)) {
      safe[key] = item
    } else if (
      key === 'grantBoundary' &&
      (item === 'M29_ONLY' ||
        item === 'M01_CUSTOMERS_APPROVED' ||
        item === 'M29_AND_M01' ||
        item === 'M29_M01_M02' ||
        item === 'M02_CONTACTS_APPROVED')
    ) {
      safe[key] = item
    } else if (
      key === 'customerStatus' &&
      typeof item === 'string' &&
      customerStatuses.has(item)
    ) {
      safe[key] = item
    } else if (
      key === 'marketCode' &&
      typeof item === 'string' &&
      ['KR', 'JP', 'US'].includes(item)
    ) {
      safe[key] = item
    } else if (
      key === 'defaultCurrency' &&
      typeof item === 'string' &&
      /^[A-Z]{3}$/.test(item)
    ) {
      safe[key] = item
    } else if (
      key === 'changedFields' &&
      Array.isArray(item) &&
      item.every(
        (field) =>
          typeof field === 'string' &&
          (customerAuditFields.has(field) ||
            field === 'displayName' ||
            contactAuditFields.has(field)),
      )
    ) {
      safe[key] = item
    } else if (
      key === 'context' &&
      typeof item === 'string' &&
      contactPrimaryContexts.has(item)
    ) {
      safe[key] = item
    } else if (
      key === 'channelKind' &&
      typeof item === 'string' &&
      contactChannelKinds.has(item)
    ) {
      safe[key] = item
    } else if (
      key === 'preferencePurpose' &&
      typeof item === 'string' &&
      contactPreferencePurposes.has(item)
    ) {
      safe[key] = item
    } else if (key === 'allowed' && typeof item === 'boolean') {
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
