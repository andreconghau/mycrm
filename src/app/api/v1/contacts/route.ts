import { createContact, listContacts } from '@/modules/contacts/presentation/api'

export async function GET(request: Request) {
  return listContacts(request)
}

export async function POST(request: Request) {
  return createContact(request)
}
