import { AuthService } from '@/modules/access-control/application/auth-service'
import { authErrorResponse } from '@/modules/access-control/application/request-auth'
import { requireTrustedOrigin } from '@/modules/access-control/infrastructure/csrf'

export async function POST(request: Request) {
  try {
    requireTrustedOrigin(request)
    const result = await new AuthService().acceptInvitation(
      await request.json(),
    )
    return Response.json({ data: result }, { status: 200 })
  } catch (error) {
    return authErrorResponse(error)
  }
}
