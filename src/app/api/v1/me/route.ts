import { selfProfileRequestSchema } from '@/modules/access-control/application/api-contracts'
import {
  authErrorResponse,
  currentPrincipal,
  requireCsrf,
} from '@/modules/access-control/application/request-auth'
import { requestCorrelationId } from '@/modules/access-control/application/request-correlation'
import { AccessRepository } from '@/modules/access-control/infrastructure/access-repository'

export async function GET() {
  try {
    const principal = await currentPrincipal()
    return Response.json(
      {
        data: {
          id: principal.userId,
          displayName: principal.displayName,
          email: principal.email,
          roles: principal.roles,
          marketIds: principal.marketIds,
        },
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (error) {
    return authErrorResponse(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const principal = await currentPrincipal()
    await requireCsrf(request, principal.sessionId)
    const body = selfProfileRequestSchema.parse(await request.json())
    const profile = await new AccessRepository().updateOwnProfile({
      userId: principal.userId,
      ...body,
      requestId: requestCorrelationId(request),
    })
    return Response.json({ data: profile })
  } catch (error) {
    return authErrorResponse(error)
  }
}
