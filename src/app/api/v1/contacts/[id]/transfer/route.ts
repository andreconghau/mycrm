import { transferContact } from '@/modules/contacts/presentation/api'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  return transferContact(request, id)
}
