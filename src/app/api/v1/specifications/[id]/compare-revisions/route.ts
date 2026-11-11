import { compareSpecificationRevisions } from '@/modules/product-specifications/presentation/api'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  return compareSpecificationRevisions(request, id)
}
