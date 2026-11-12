import { z } from 'zod'
import { setQuotationAdjustment } from '@/modules/quotations/presentation/api'

const kindSchema = z.enum(['freight', 'insurance'])

export async function PUT(request: Request, context: { params: Promise<{ id: string; kind: string }> }) {
  const { id, kind } = await context.params
  const parsed = kindSchema.safeParse(kind)
  if (!parsed.success) return Response.json({ error: { code: 'NOT_FOUND', message: 'Quotation adjustment not found' } }, { status: 404 })
  return setQuotationAdjustment(request, id, parsed.data === 'freight' ? 'FREIGHT' : 'INSURANCE')
}
