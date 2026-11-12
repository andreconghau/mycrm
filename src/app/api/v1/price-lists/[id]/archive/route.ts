import { archivePriceList } from '@/modules/price-lists/presentation/api'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return archivePriceList(request, (await params).id)
}
