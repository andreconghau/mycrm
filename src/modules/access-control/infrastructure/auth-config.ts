import 'server-only'
import { z } from 'zod'

const secret = z
  .string()
  .min(32, 'Authentication secrets must be at least 32 characters')

const environmentSchema = z.object({
  AUTH_ACCESS_SECRET: secret,
  AUTH_CSRF_SECRET: secret,
  AUTH_ISSUER: z.string().min(1).default('seafood-export-crm'),
  AUTH_AUDIENCE: z.string().min(1).default('seafood-export-crm-web'),
  APP_ORIGIN: z.url(),
})

export type AuthConfig = {
  accessSecret: Uint8Array
  csrfSecret: Uint8Array
  issuer: string
  audience: string
  appOrigin: string
  secureCookies: boolean
  accessTtlSeconds: number
  absoluteTtlSeconds: number
  idleTtlSeconds: number
}

let cached: AuthConfig | undefined

export function getAuthConfig(): AuthConfig {
  if (cached) return cached
  const value = environmentSchema.parse(process.env)
  const encoder = new TextEncoder()
  cached = {
    accessSecret: encoder.encode(value.AUTH_ACCESS_SECRET),
    csrfSecret: encoder.encode(value.AUTH_CSRF_SECRET),
    issuer: value.AUTH_ISSUER,
    audience: value.AUTH_AUDIENCE,
    appOrigin: new URL(value.APP_ORIGIN).origin,
    secureCookies: new URL(value.APP_ORIGIN).protocol === 'https:',
    accessTtlSeconds: 60 * 60,
    absoluteTtlSeconds: 7 * 24 * 60 * 60,
    idleTtlSeconds: 3 * 24 * 60 * 60,
  }
  return cached
}

export function resetAuthConfigForTests() {
  cached = undefined
}
