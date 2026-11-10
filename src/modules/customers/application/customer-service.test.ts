import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { AccessDeniedError, type EffectiveGrant, type Principal } from '@/modules/access-control/domain/types'
import { CustomerService } from './customer-service'
import type { CustomerRepository } from '../infrastructure/customer-repository'

const actor: Principal = {
  userId: 7,
  sessionId: 11,
  displayName: 'Sales User',
  email: 'sales@example.test',
  roles: ['sale'],
  teamIds: [3],
  marketIds: [9],
}

const readGrant: EffectiveGrant = {
  resource: 'customers',
  action: 'read',
  recordScope: 'OWN',
  readFields: ['id', 'code', 'legalName'],
  writeFields: [],
}

describe('CustomerService', () => {
  const repository = {
    list: vi.fn(),
    create: vi.fn(),
    resolveMarketId: vi.fn(),
  }
  const service = new CustomerService(
    repository as unknown as CustomerRepository,
  )

  beforeEach(() => vi.clearAllMocks())

  it('applies market and OWN scope before projecting list results', async () => {
    repository.list.mockResolvedValue({
      items: [
        {
          id: 21,
          code: 'CUS-021',
          legalName: 'Scoped Buyer',
          website: 'https://private.example.test',
        },
      ],
      historyItems: [],
      nextCursor: null,
    })

    const result = await service.list(
      actor,
      [readGrant],
      { marketCode: 'kr' },
      9,
    )

    expect(repository.list).toHaveBeenCalledWith(
      expect.objectContaining({ actor, marketId: 9, scope: 'OWN' }),
    )
    expect(result.items).toEqual([
      { id: 21, code: 'CUS-021', legalName: 'Scoped Buyer' },
    ])
    expect(result.items[0]).not.toHaveProperty('website')
  })

  it('denies reads when the actor has no Customers grant', async () => {
    await expect(
      service.list(actor, [], { marketCode: 'KR' }, 9),
    ).rejects.toBeInstanceOf(AccessDeniedError)
    expect(repository.list).not.toHaveBeenCalled()
  })

  it('does not allow an OWN creator to assign a buyer to another owner', async () => {
    const createGrant: EffectiveGrant = {
      resource: 'customers',
      action: 'create',
      recordScope: 'OWN',
      readFields: [],
      writeFields: ['code', 'legalName', 'countryCode', 'ownerId'],
    }
    const readWithGrant: EffectiveGrant = {
      ...readGrant,
      readFields: ['id', 'legalName'],
    }

    await expect(
      service.create(
        actor,
        [createGrant, readWithGrant],
        9,
        {
          code: 'CUS-001',
          legalName: 'Buyer',
          countryCode: 'KR',
          ownerId: 8,
        },
        '00000000-0000-4000-8000-000000000001',
      ),
    ).rejects.toBeInstanceOf(AccessDeniedError)
    expect(repository.create).not.toHaveBeenCalled()
  })
})
