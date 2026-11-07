import { NextResponse } from 'next/server'
import { AuthService } from '@/modules/access-control/application/auth-service'
import {
  authErrorResponse,
  currentPrincipal,
  requireCsrf,
} from '@/modules/access-control/application/request-auth'
import { AuthenticationError } from '@/modules/access-control/domain/types'
import { clearAuthCookies } from '@/modules/access-control/infrastructure/auth-cookies'

export async function POST(request: Request) {
  try {
    const principal = await currentPrincipal()
    await requireCsrf(request, principal.sessionId)
    await new AuthService().logout(principal.sessionId, principal.userId)
    const response = new NextResponse(null, {
      status: 204,
      headers: { 'Cache-Control': 'private, no-store' },
    })
    clearAuthCookies(response)
    return response
  } catch (error) {
    if (error instanceof AuthenticationError) {
      const response = NextResponse.json(
        { error: { code: 'UNAUTHENTICATED', message: error.message } },
        { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
      )
      clearAuthCookies(response)
      return response
    }
    return authErrorResponse(error)
  }
}
