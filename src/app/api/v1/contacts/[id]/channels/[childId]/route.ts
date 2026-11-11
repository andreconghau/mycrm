import { updateContactChannel } from '@/modules/contacts/presentation/api'

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; childId: string }> },
) {
  const { id, childId } = await context.params
  return updateContactChannel(request, id, childId)
}
