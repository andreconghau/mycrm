import { contactTimeline } from '@/modules/contacts/presentation/api'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  return contactTimeline(request, id)
}
