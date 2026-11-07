import 'server-only'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { AuthService } from './auth-service'
import { cookieNames } from '../infrastructure/auth-cookies'
import { requireTrustedOrigin, verifyCsrfToken } from '../infrastructure/csrf'
import { AccessDeniedError, AuthenticationError } from '../domain/types'
import { requireGrant } from './authorization'

export async function currentPrincipal() {
  const cookieStore = await cookies()
  return new AuthService().authenticate(
    cookieStore.get(cookieNames().access)?.value,
  )
}

export async function requirePermission(resource: string, action: string) {
  const auth = new AuthService()
  const principal = await currentPrincipal()
  const grants = await auth.effectiveGrants(principal)
  const policy = requireGrant(grants, resource, action)
  return { principal, grants, policy }
}

export async function requireCsrf(request: Request, sessionId: number) {
  requireTrustedOrigin(request)
  const cookieStore = await cookies()
  const cookie = cookieStore.get(cookieNames().csrf)?.value
  const header = request.headers.get('x-csrf-token')
  if (
    !cookie ||
    !header ||
    cookie !== header ||
    !verifyCsrfToken(sessionId, header)
  ) {
    throw new AccessDeniedError('CSRF validation failed')
  }
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthenticationError) {
    return Response.json(
      { error: { code: 'UNAUTHENTICATED', message: error.message } },
      { status: 401 },
    )
  }
  if (error instanceof AccessDeniedError) {
    return Response.json(
      { error: { code: 'ACTION_FORBIDDEN', message: error.message } },
      { status: 403 },
    )
  }
  if (error instanceof z.ZodError) {
    return Response.json(
      {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Request validation failed',
        },
      },
      { status: 400 },
    )
  }
  console.error('access-control request failed', {
    errorName: error instanceof Error ? error.name : 'UnknownError',
    errorCode:
      typeof error === 'object' && error && 'code' in error
        ? String(error.code)
        : 'UNCLASSIFIED',
  })
  return Response.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'The request could not be completed',
      },
    },
    { status: 500 },
  )
}
