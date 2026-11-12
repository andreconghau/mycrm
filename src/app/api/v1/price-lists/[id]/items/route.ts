import { createPriceListItem, listPriceListItems } from '@/modules/price-lists/presentation/api'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return listPriceListItems(request, (await params).id)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return createPriceListItem(request, (await params).id)
}
