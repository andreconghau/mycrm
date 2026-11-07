import { NextResponse } from 'next/server'
import { AuthService } from '@/modules/access-control/application/auth-service'
import { authErrorResponse } from '@/modules/access-control/application/request-auth'
import { setAuthCookies } from '@/modules/access-control/infrastructure/auth-cookies'
import { requireTrustedOrigin } from '@/modules/access-control/infrastructure/csrf'

export async function POST(request: Request) {
  try {
    requireTrustedOrigin(request)
    const auth = new AuthService()
    const tokens = await auth.login(await request.json())
    const principal = await auth.authenticate(tokens.accessToken)
    const response = NextResponse.json({
      data: {
        user: { id: principal.userId, displayName: principal.displayName },
        accessExpiresAt: tokens.accessExpiresAt,
      },
    })
    setAuthCookies(response, tokens)
    response.headers.set('Cache-Control', 'private, no-store')
    return response
  } catch (error) {
    return authErrorResponse(error)
  }
}
