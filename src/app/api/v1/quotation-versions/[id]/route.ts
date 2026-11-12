import { updateQuotationVersion } from '@/modules/quotations/presentation/api'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  return updateQuotationVersion(request, id)
}
