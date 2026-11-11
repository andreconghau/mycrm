import {
  createContactChannel,
  listContactChannels,
} from '@/modules/contacts/presentation/api'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  return listContactChannels(request, id)
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  return createContactChannel(request, id)
}
