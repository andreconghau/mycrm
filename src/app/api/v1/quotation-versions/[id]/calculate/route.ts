import { calculateQuotation } from '@/modules/quotations/presentation/api'

export function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return context.params.then(({ id }) => calculateQuotation(request, id))
}
