import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import {
  authErrorResponse,
  requirePermission,
} from '@/modules/access-control/application/request-auth'

const assetDirectory = join(process.cwd(), 'node_modules/swagger-ui-dist')
const assets = {
  'swagger-ui-bundle.js': 'application/javascript; charset=utf-8',
  'swagger-ui.css': 'text/css; charset=utf-8',
} as const

type AssetName = keyof typeof assets

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  try {
    await requirePermission('access.grants', 'read')
    const { file } = await params
    if (!(file in assets)) {
      return Response.json(
        { error: { code: 'NOT_FOUND', message: 'Swagger asset not found' } },
        { status: 404 },
      )
    }

    const assetName = file as AssetName
    return new Response(await readFile(join(assetDirectory, assetName)), {
      headers: {
        'Cache-Control': 'private, max-age=3600',
        'Content-Type': assets[assetName],
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    return authErrorResponse(error)
  }
}
