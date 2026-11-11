import { createProduct, listProducts } from '@/modules/products/presentation/api'

export async function GET(request: Request) {
  return listProducts(request)
}

export async function POST(request: Request) {
  return createProduct(request)
}
