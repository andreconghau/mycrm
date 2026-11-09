import { createTeamRequestSchema } from '@/modules/access-control/application/api-contracts'
import {
  authErrorResponse,
  requireCsrf,
  requirePermission,
} from '@/modules/access-control/application/request-auth'
import { AccessRepository } from '@/modules/access-control/infrastructure/access-repository'
import { requestCorrelationId } from '@/modules/access-control/application/request-correlation'

export async function POST(request: Request) {
  try {
    const { principal } = await requirePermission('access.teams', 'manage')
    await requireCsrf(request, principal.sessionId)
    const { name } = createTeamRequestSchema.parse(await request.json())
    const team = await new AccessRepository().createTeam({
      actorId: principal.userId,
      name,
      requestId: requestCorrelationId(request),
    })
    return Response.json({ data: team }, { status: 201 })
  } catch (error) {
    return authErrorResponse(error)
  }
}
