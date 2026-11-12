import { updateQuotationLine } from '@/modules/quotations/presentation/api'

export async function PATCH(request: Request, context: { params: Promise<{ id: string; lineId: string }> }) {
  const { id, lineId } = await context.params
  return updateQuotationLine(request, id, lineId)
}
