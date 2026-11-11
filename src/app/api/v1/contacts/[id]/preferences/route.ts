import {
  createContactPreference,
  listContactPreferences,
} from '@/modules/contacts/presentation/api'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  return listContactPreferences(request, id)
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  return createContactPreference(request, id)
}
