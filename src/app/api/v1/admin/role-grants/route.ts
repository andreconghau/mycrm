import {
  authErrorResponse,
  requirePermission,
} from '@/modules/access-control/application/request-auth'
import { AccessRepository } from '@/modules/access-control/infrastructure/access-repository'

export async function GET() {
  try {
    await requirePermission('access.grants', 'read')
    return Response.json(
      { data: await new AccessRepository().listRoleGrants() },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (error) {
    return authErrorResponse(error)
  }
}
