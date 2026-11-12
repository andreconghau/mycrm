import { listPriceSelections, recordPriceSelection } from '@/modules/price-lists/presentation/api'

export function GET(request: Request) {
  return listPriceSelections(request)
}

export function POST(request: Request) {
  return recordPriceSelection(request)
}
