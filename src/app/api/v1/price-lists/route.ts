import { createPriceList, listPriceLists } from '@/modules/price-lists/presentation/api'

export function GET(request: Request) {
  return listPriceLists(request)
}

export function POST(request: Request) {
  return createPriceList(request)
}
