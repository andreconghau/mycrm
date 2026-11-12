import { updatePriceListItem } from '@/modules/price-lists/presentation/api'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const values = await params
  return updatePriceListItem(request, values.id, values.itemId)
}
