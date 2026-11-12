import { getQuotation } from '@/modules/quotations/presentation/api'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  return getQuotation(request, id)
}
