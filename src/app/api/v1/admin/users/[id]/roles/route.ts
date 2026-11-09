import {
  positiveIdSchema,
  roleAssignmentRequestSchema,
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
    const { principal } = await requirePermission('access.roles', 'manage')
    await requireCsrf(request, principal.sessionId)
    const userId = positiveIdSchema.parse((await params).id)
    const body = roleAssignmentRequestSchema.parse(await request.json())
    await new AccessRepository().assignRole({
      actorId: principal.userId,
      userId,
      ...body,
      requestId: requestCorrelationId(request),
    })
    return Response.json({
      data: { userId, roleCode: body.roleCode, active: body.active },
    })
  } catch (error) {
    return authErrorResponse(error)
  }
}
