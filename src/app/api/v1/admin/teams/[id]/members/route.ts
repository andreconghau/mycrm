import {
  assignTeamMemberRequestSchema,
  positiveIdSchema,
} from '@/modules/access-control/application/api-contracts'
import {
  authErrorResponse,
  requireCsrf,
  requirePermission,
} from '@/modules/access-control/application/request-auth'
import { AccessRepository } from '@/modules/access-control/infrastructure/access-repository'
import { requestCorrelationId } from '@/modules/access-control/application/request-correlation'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { principal } = await requirePermission('access.teams', 'manage')
    await requireCsrf(request, principal.sessionId)
    const teamId = positiveIdSchema.parse((await params).id)
    const { userId } = assignTeamMemberRequestSchema.parse(await request.json())
    await new AccessRepository().assignTeam({
      actorId: principal.userId,
      userId,
      teamId,
      requestId: requestCorrelationId(request),
    })
    return Response.json({ data: { teamId, userId } }, { status: 201 })
  } catch (error) {
    return authErrorResponse(error)
  }
}
