import { createCustomer, listCustomers } from '@/modules/customers/presentation/api'

export async function GET(request: Request) {
  return listCustomers(request)
}

export async function POST(request: Request) {
  return createCustomer(request)
}
