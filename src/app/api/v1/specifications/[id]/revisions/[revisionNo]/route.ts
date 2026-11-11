import { updateSpecificationRevision } from '@/modules/product-specifications/presentation/api'

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; revisionNo: string }> },
) {
  const { id, revisionNo } = await context.params
  return updateSpecificationRevision(request, id, revisionNo)
}
