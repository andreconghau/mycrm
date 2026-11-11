import { describe, expect, it, vi } from 'vitest'
import {
  AccessDeniedError,
  type EffectiveGrant,
  type Principal,
} from '@/modules/access-control/domain/types'
import { SpecificationService } from './specification-service'
import {
  specificationSaleGrants,
  specificationAdminGrants,
} from '../domain/specification-grants'

const actor: Principal = {
  userId: 1,
  sessionId: 1,
  displayName: 'User',
  email: 'user@example.test',
  roles: ['sale'],
  teamIds: [],
  marketIds: [1],
}
const validDraft = {
  nameEn: 'Shrimp',
  nameVi: 'Tôm',
  nameKo: '새우',
  grade: 'A',
  processing: 'PDTO',
  netWeightPerPack: '1',
  weightUnit: 'KG',
  packsPerCarton: 10,
  uom: 'CTN',
  packaging: 'IQF bag',
}

describe('specification service authorization', () => {
  it('denies sales write attempts before invoking persistence', async () => {
    const create = vi.fn()
    const service = new SpecificationService({ create } as never)
    await expect(
      service.create(
        actor,
        [...specificationSaleGrants] as unknown as EffectiveGrant[],
        1,
        3,
        validDraft,
        'request-1',
      ),
    ).rejects.toBeInstanceOf(AccessDeniedError)
    expect(create).not.toHaveBeenCalled()
  })

  it('denies an actor with no specification grants', async () => {
    const create = vi.fn()
    const service = new SpecificationService({ create } as never)
    await expect(
      service.create(actor, [], 1, 3, validDraft, 'request-2'),
    ).rejects.toBeInstanceOf(AccessDeniedError)
    expect(create).not.toHaveBeenCalled()
  })

  it('enforces the approved write-field projection at the service boundary', async () => {
    const create = vi.fn()
    const restricted = specificationAdminGrants.map((grant) =>
      grant.action === 'create'
        ? { ...grant, writeFields: ['productId'] }
        : grant,
    ) as unknown as EffectiveGrant[]
    const service = new SpecificationService({ create } as never)
    await expect(
      service.create(actor, restricted, 1, 3, validDraft, 'request-3'),
    ).rejects.toBeInstanceOf(AccessDeniedError)
    expect(create).not.toHaveBeenCalled()
  })
})
