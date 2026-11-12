import {
  createSpecificationRevision,
  listSpecificationRevisions,
} from '@/modules/product-specifications/presentation/api'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  return listSpecificationRevisions(request, id)
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  return createSpecificationRevision(request, id)
}
