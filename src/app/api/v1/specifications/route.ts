import { listSpecifications } from '@/modules/product-specifications/presentation/api'

export async function GET(request: Request) {
  return listSpecifications(request)
}
