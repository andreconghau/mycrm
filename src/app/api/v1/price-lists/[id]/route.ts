import { getPriceList, updatePriceList } from '@/modules/price-lists/presentation/api'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return getPriceList(request, (await params).id)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return updatePriceList(request, (await params).id)
}
