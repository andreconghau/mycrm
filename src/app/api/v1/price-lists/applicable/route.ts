import { applicablePrices } from '@/modules/price-lists/presentation/api'

export function GET(request: Request) {
  return applicablePrices(request)
}
