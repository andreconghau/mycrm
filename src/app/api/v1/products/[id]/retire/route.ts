import { retireProduct } from '@/modules/products/presentation/api'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  return retireProduct(request, id)
}
