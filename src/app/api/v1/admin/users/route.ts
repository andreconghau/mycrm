import {
  authErrorResponse,
  requirePermission,
} from '@/modules/access-control/application/request-auth'
import { AccessRepository } from '@/modules/access-control/infrastructure/access-repository'

export async function GET(request: Request) {
  try {
    await requirePermission('access.users', 'list')
    const requested = Number(
      new URL(request.url).searchParams.get('limit') ?? '50',
    )
    const users = await new AccessRepository().listUsers(requested)
    return Response.json(
      { data: users },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (error) {
    return authErrorResponse(error)
  }
}
