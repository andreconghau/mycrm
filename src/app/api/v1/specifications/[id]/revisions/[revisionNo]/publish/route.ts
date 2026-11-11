import { publishSpecificationRevision } from '@/modules/product-specifications/presentation/api'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; revisionNo: string }> },
) {
  const { id, revisionNo } = await context.params
  return publishSpecificationRevision(request, id, revisionNo)
}
