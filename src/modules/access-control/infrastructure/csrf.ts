import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { getAuthConfig } from './auth-config'
import { AccessDeniedError } from '../domain/types'

function signature(sessionId: number, nonce: string) {
  return createHmac('sha256', getAuthConfig().csrfSecret)
    .update(`${sessionId}.${nonce}`)
    .digest('base64url')
}

export function createCsrfToken(sessionId: number) {
  const nonce = randomBytes(24).toString('base64url')
  return `${nonce}.${signature(sessionId, nonce)}`
}

export function verifyCsrfToken(sessionId: number, token: string) {
  const separator = token.indexOf('.')
  if (separator < 1) return false
  const nonce = token.slice(0, separator)
  const supplied = Buffer.from(token.slice(separator + 1), 'base64url')
  const expected = Buffer.from(signature(sessionId, nonce), 'base64url')
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  )
}

export function requireTrustedOrigin(request: Request) {
  const expected = getAuthConfig().appOrigin
  const source = request.headers.get('origin') ?? request.headers.get('referer')
  let actual = ''
  try {
    actual = source ? new URL(source).origin : ''
  } catch {
    actual = ''
  }
  if (actual !== expected) {
    throw new AccessDeniedError('Untrusted request origin')
  }
}
