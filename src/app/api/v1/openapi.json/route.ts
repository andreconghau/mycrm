import { openApiDocument } from '@/modules/api-docs/openapi'

export async function GET() {
  return Response.json(openApiDocument, {
    headers: {
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
