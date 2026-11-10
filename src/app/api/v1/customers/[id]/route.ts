import {
  getCustomer,
  updateCustomer,
} from '@/modules/customers/presentation/api'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  return getCustomer(request, id)
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  return updateCustomer(request, id)
}
