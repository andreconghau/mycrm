import {
  disableUserRequestSchema,
  positiveIdSchema,
} from '@/modules/access-control/application/api-contracts'
import {
  authErrorResponse,
  requireCsrf,
  requirePermission,
} from '@/modules/access-control/application/request-auth'
import { AccessRepository } from '@/modules/access-control/infrastructure/access-repository'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { principal } = await requirePermission('access.users', 'disable')
    await requireCsrf(request, principal.sessionId)
    const userId = positiveIdSchema.parse((await params).id)
    const { reason } = disableUserRequestSchema.parse(await request.json())
    await new AccessRepository().disableUser({
      actorId: principal.userId,
      userId,
      reason,
    })
    return Response.json({ data: { id: userId, status: 'DISABLED' } })
  } catch (error) {
    return authErrorResponse(error)
  }
}
