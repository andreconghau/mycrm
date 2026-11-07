import { createHash, randomBytes } from 'node:crypto'
import { jwtVerify, SignJWT } from 'jose'
import { getAuthConfig } from './auth-config'

export function generateOpaqueSecret() {
  return randomBytes(32).toString('base64url')
}

export function hashOpaqueSecret(secret: string) {
  return createHash('sha256').update(secret).digest('base64url')
}

export function encodeRefreshToken(sessionId: number, secret: string) {
  return `${sessionId}.${secret}`
}

export function decodeRefreshToken(value: string) {
  const separator = value.indexOf('.')
  if (separator < 1) return null
  const sessionId = Number(value.slice(0, separator))
  const secret = value.slice(separator + 1)
  if (
    !Number.isSafeInteger(sessionId) ||
    sessionId <= 0 ||
    secret.length < 32
  ) {
    return null
  }
  return { sessionId, secret }
}

export async function signAccessToken(userId: number, sessionId: number) {
  const config = getAuthConfig()
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(String(userId))
    .setIssuer(config.issuer)
    .setAudience(config.audience)
    .setJti(randomBytes(16).toString('hex'))
    .setIssuedAt()
    .setExpirationTime(`${config.accessTtlSeconds}s`)
    .sign(config.accessSecret)
}

export async function verifyAccessToken(value: string) {
  const config = getAuthConfig()
  const { payload } = await jwtVerify(value, config.accessSecret, {
    algorithms: ['HS256'],
    issuer: config.issuer,
    audience: config.audience,
  })
  const userId = Number(payload.sub)
  const sessionId = Number(payload.sid)
  if (!Number.isSafeInteger(userId) || !Number.isSafeInteger(sessionId)) {
    throw new Error('Invalid access token claims')
  }
  return { userId, sessionId }
}
