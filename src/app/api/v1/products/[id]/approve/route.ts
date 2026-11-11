import { approveProduct } from '@/modules/products/presentation/api'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  return approveProduct(request, id)
}
