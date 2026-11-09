import { beforeEach, describe, expect, it, vi } from 'vitest'

const currentPrincipal = vi.hoisted(() => vi.fn())
const list = vi.hoisted(() => vi.fn())

vi.mock('@/modules/access-control/application/request-auth', () => ({
  currentPrincipal,
  authErrorResponse: (error: Error) =>
    Response.json(
      {
        error: {
          code:
            error.name === 'ZodError'
              ? 'VALIDATION_FAILED'
              : 'ACTION_FORBIDDEN',
        },
      },
      { status: error.name === 'ZodError' ? 400 : 403 },
    ),
}))
vi.mock('@/modules/access-control/infrastructure/audit-repository', () => ({
  AuditRepository: class {
    list = list
  },
}))

import { GET } from './route'

describe('GET /api/v1/audit-events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    list.mockResolvedValue({ items: [], nextCursor: null })
  })

  it('denies non-admin roles before querying history', async () => {
    currentPrincipal.mockResolvedValue({ roles: ['manager'] })
    const response = await GET(
      new Request('http://localhost/api/v1/audit-events'),
    )
    expect(response.status).toBe(403)
    expect(list).not.toHaveBeenCalled()
  })

  it('validates filters and returns bounded cursor pages without caching', async () => {
    currentPrincipal.mockResolvedValue({ roles: ['admin'] })
    list.mockResolvedValue({ items: [], nextCursor: null })
    const invalid = await GET(
      new Request('http://localhost/api/v1/audit-events?limit=1000'),
    )
    expect(invalid.status).toBe(400)

    const response = await GET(
      new Request('http://localhost/api/v1/audit-events?actorId=12&limit=25'),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 12, limit: 25 }),
    )
  })
})
