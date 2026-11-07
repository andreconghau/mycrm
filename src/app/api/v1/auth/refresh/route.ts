import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { AuthService } from '@/modules/access-control/application/auth-service'
import {
  authErrorResponse,
  requireCsrf,
} from '@/modules/access-control/application/request-auth'
import {
  cookieNames,
  setAuthCookies,
} from '@/modules/access-control/infrastructure/auth-cookies'
import { decodeRefreshToken } from '@/modules/access-control/infrastructure/tokens'

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get(cookieNames().refresh)?.value
    const decoded = refreshToken ? decodeRefreshToken(refreshToken) : null
    if (!decoded)
      return Response.json(
        { error: { code: 'UNAUTHENTICATED' } },
        { status: 401 },
      )
    await requireCsrf(request, decoded.sessionId)
    const tokens = await new AuthService().refresh(refreshToken)
    const response = NextResponse.json({
      data: { accessExpiresAt: tokens.accessExpiresAt },
    })
    setAuthCookies(response, tokens)
    response.headers.set('Cache-Control', 'private, no-store')
    return response
  } catch (error) {
    return authErrorResponse(error)
  }
}
