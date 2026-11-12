import { describe, expect, it } from 'vitest'
import { AccessDeniedError } from '@/modules/access-control/domain/types'
import type { Principal } from '@/modules/access-control/domain/types'
import { PriceListService } from './price-list-service'

describe('PriceListService authorization', () => {
  it('denies reads when no price_lists:read grant is present', async () => {
    const service = new PriceListService({} as never)
    const actor: Principal = { userId: 1, sessionId: 1, displayName: 'Sale', email: 'sale@example.test', roles: ['sale'], teamIds: [], marketIds: [1] }
    await expect(service.list(actor, [], {}, 1)).rejects.toBeInstanceOf(AccessDeniedError)
  })
})
