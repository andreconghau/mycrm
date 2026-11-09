import { AccessDeniedError } from '@/modules/access-control/domain/types'
import {
  authErrorResponse,
  currentPrincipal,
} from '@/modules/access-control/application/request-auth'
import { auditQuerySchema } from '@/modules/access-control/application/audit-contracts'
import { AuditRepository } from '@/modules/access-control/infrastructure/audit-repository'

export async function GET(request: Request) {
  try {
    const principal = await currentPrincipal()
    if (!principal.roles.includes('admin'))
      throw new AccessDeniedError(
        'Audit history is restricted to administrators',
      )
    const parsed = auditQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    )
    const data = await new AuditRepository().list(parsed)
    return Response.json(
      { data },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (error) {
    return authErrorResponse(error)
  }
}
