import { AuthService } from '@/modules/access-control/application/auth-service'
import {
  authErrorResponse,
  currentPrincipal,
} from '@/modules/access-control/application/request-auth'

export async function GET() {
  try {
    const principal = await currentPrincipal()
    const grants = await new AuthService().effectiveGrants(principal)
    return Response.json(
      { data: grants },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (error) {
    return authErrorResponse(error)
  }
}
