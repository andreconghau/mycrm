import { createQuotation, listQuotationRfqOptions, listQuotations } from '@/modules/quotations/presentation/api'

export function GET(request: Request) {
  if (new URL(request.url).searchParams.get('resource') === 'rfqs') return listQuotationRfqOptions(request)
  return listQuotations(request)
}

export function POST(request: Request) {
  return createQuotation(request)
}
