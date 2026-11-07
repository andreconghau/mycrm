import {
  authErrorResponse,
  currentPrincipal,
} from '@/modules/access-control/application/request-auth'

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
