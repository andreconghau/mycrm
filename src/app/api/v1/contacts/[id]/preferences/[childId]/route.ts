import { updateContactPreference } from '@/modules/contacts/presentation/api'

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; childId: string }> },
) {
  const { id, childId } = await context.params
  return updateContactPreference(request, id, childId)
}
