import {
  createProductSpecification,
  listProductSpecifications,
} from '@/modules/product-specifications/presentation/api'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  return listProductSpecifications(request, id)
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  return createProductSpecification(request, id)
}
