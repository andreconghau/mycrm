import { contactDuplicateCandidates } from '@/modules/contacts/presentation/api'

export async function POST(request: Request) {
  return contactDuplicateCandidates(request)
}
