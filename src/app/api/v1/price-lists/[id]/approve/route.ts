import { approvePriceList } from '@/modules/price-lists/presentation/api'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return approvePriceList(request, (await params).id)
}
