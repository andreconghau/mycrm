import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { AccessDeniedError, type EffectiveGrant, type Principal } from '@/modules/access-control/domain/types'
import { ProductService } from './product-service'
import type { ProductRepository } from '../infrastructure/product-repository'

const saleActor: Principal = {
  userId: 7,
  sessionId: 11,
  displayName: 'Sales User',
  email: 'sales@example.test',
  roles: ['sale'],
  teamIds: [],
  marketIds: [],
}

const readGrant: EffectiveGrant = {
  resource: 'products',
  action: 'read',
  recordScope: 'ALL',
  readFields: ['id', 'sku', 'displayName', 'status'],
  writeFields: [],
}

describe('ProductService', () => {
  const repository = {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    transition: vi.fn(),
  }
  const service = new ProductService(
    repository as unknown as ProductRepository,
  )

  beforeEach(() => vi.clearAllMocks())

  it('projects list results to only the granted read fields', async () => {
    repository.list.mockResolvedValue({
      items: [
        {
          id: 1,
          sku: 'SQ-001',
          displayName: 'Squid',
          status: 'ACTIVE',
          descriptionEn: 'secret cost note',
        },
      ],
      nextCursor: null,
    })

    const result = await service.list(saleActor, [readGrant], {})

    expect(result.items).toEqual([
      { id: 1, sku: 'SQ-001', displayName: 'Squid', status: 'ACTIVE' },
    ])
    expect(result.items[0]).not.toHaveProperty('descriptionEn')
  })

  it('denies reads when the actor has no products grant (AC-15/AC-16)', async () => {
    await expect(service.list(saleActor, [], {})).rejects.toBeInstanceOf(
      AccessDeniedError,
    )
    expect(repository.list).not.toHaveBeenCalled()
  })

  it('denies create for a read-only sale grant (AC-04)', async () => {
    await expect(
      service.create(
        saleActor,
        [readGrant],
        {
          sku: 'SQ-002',
          names: { en: 'Octopus', vi: 'Bạch tuộc', ko: '문어' },
          defaultUnit: 'KG',
        },
        '00000000-0000-4000-8000-000000000001',
      ),
    ).rejects.toBeInstanceOf(AccessDeniedError)
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('rejects writes to fields outside the granted write-field allowlist', async () => {
    const createGrant: EffectiveGrant = {
      resource: 'products',
      action: 'create',
      recordScope: 'ALL',
      readFields: [],
      writeFields: ['sku', 'defaultUnit', 'names'],
    }
    await expect(
      service.create(
        saleActor,
        [createGrant, readGrant],
        {
          sku: 'SQ-003',
          names: { en: 'Cuttlefish', vi: 'Mực nang', ko: '갑오징어' },
          defaultUnit: 'KG',
          category: 'Cephalopod',
        },
        '00000000-0000-4000-8000-000000000002',
      ),
    ).rejects.toBeInstanceOf(AccessDeniedError)
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('denies approve/retire transitions without the matching grant', async () => {
    await expect(
      service.approve(saleActor, [readGrant], 1, { version: 1 }, 'req-1'),
    ).rejects.toBeInstanceOf(AccessDeniedError)
    await expect(
      service.retire(saleActor, [readGrant], 1, { version: 1 }, 'req-2'),
    ).rejects.toBeInstanceOf(AccessDeniedError)
    expect(repository.transition).not.toHaveBeenCalled()
  })
})
