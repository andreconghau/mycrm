import {
  marketMembershipRequestSchema,
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
    const { principal } = await requirePermission('access.markets', 'manage')
    await requireCsrf(request, principal.sessionId)
    const marketId = positiveIdSchema.parse((await params).id)
    const body = marketMembershipRequestSchema.parse(await request.json())
    await new AccessRepository().grantMarket({
      actorId: principal.userId,
      marketId,
      ...body,
    })
    return Response.json({ data: { marketId, ...body } })
  } catch (error) {
    return authErrorResponse(error)
  }
}
