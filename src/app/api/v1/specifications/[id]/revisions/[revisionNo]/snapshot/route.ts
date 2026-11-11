import { getSpecificationRevisionSnapshot } from '@/modules/product-specifications/presentation/api'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; revisionNo: string }> },
) {
  const { id, revisionNo } = await context.params
  return getSpecificationRevisionSnapshot(request, id, revisionNo)
}
