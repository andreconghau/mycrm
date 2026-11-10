import {
  authErrorResponse,
  currentPrincipal,
} from '@/modules/access-control/application/request-auth'
import { CustomerService } from '@/modules/customers/application/customer-service'

export async function GET() {
  try {
    const principal = await currentPrincipal()
    const data = await new CustomerService().listMarkets(principal)
    return Response.json(
      { data },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (error) {
    return authErrorResponse(error)
  }
}
