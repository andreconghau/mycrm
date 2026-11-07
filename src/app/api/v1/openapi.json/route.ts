import {
  authErrorResponse,
  requirePermission,
} from '@/modules/access-control/application/request-auth'
import { openApiDocument } from '@/modules/api-docs/openapi'

export async function GET() {
  try {
    await requirePermission('access.grants', 'read')
    return Response.json(openApiDocument, {
      headers: {
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    return authErrorResponse(error)
  }
}
