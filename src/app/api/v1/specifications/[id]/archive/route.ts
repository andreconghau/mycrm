import { archiveSpecification } from '@/modules/product-specifications/presentation/api'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  return archiveSpecification(request, id)
}
