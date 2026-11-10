import { duplicateCandidates } from '@/modules/customers/presentation/api'

export async function POST(request: Request) {
  return duplicateCandidates(request)
}
