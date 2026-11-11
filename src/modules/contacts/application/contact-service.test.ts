import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  AccessDeniedError,
  type EffectiveGrant,
  type Principal,
} from '@/modules/access-control/domain/types'
import { ContactService } from './contact-service'
import type { ContactRepository } from '../infrastructure/contact-repository'

const actor: Principal = {
  userId: 7,
  sessionId: 11,
  displayName: 'Sales User',
  email: 'sales@example.test',
  roles: ['sale'],
  teamIds: [3],
  marketIds: [9],
}

function grant(
  action: string,
  recordScope: EffectiveGrant['recordScope'] = 'OWN',
  readFields = ['id', 'displayName', 'customerId', 'version'],
  writeFields: string[] = [],
): EffectiveGrant {
  return { resource: 'contacts', action, recordScope, readFields, writeFields }
}

describe('ContactService', () => {
  const repository = {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    listChannels: vi.fn(),
    listPreferences: vi.fn(),
    setPrimary: vi.fn(),
    duplicateCandidates: vi.fn(),
    timeline: vi.fn(),
  }
  const service = new ContactService(
    repository as unknown as ContactRepository,
  )

  beforeEach(() => vi.clearAllMocks())

  it('passes the parent-derived scope to the repository and projects read fields', async () => {
    repository.list.mockResolvedValue({
      items: [
        {
          id: 21,
          customerId: 4,
          displayName: 'Kim Minji',
          department: 'Procurement',
          version: 1,
        },
      ],
      historyItems: [],
      nextCursor: null,
    })

    const result = await service.list(
      actor,
      [grant('list')],
      { marketCode: 'kr' },
      9,
    )

    expect(repository.list).toHaveBeenCalledWith(
      expect.objectContaining({ actor, marketId: 9, scope: 'OWN' }),
    )
    expect(result.items).toEqual([
      { id: 21, customerId: 4, displayName: 'Kim Minji', version: 1 },
    ])
    // `department` is outside the grant's read fields, so it is dropped.
    expect(result.items[0]).not.toHaveProperty('department')
  })

  it('never exposes a channel handle through the list projection (AC-15)', async () => {
    repository.list.mockResolvedValue({
      items: [{ id: 21, displayName: 'Kim Minji', handle: 'minji@buyer.test' }],
      historyItems: [],
      nextCursor: null,
    })

    const result = await service.list(
      actor,
      [grant('list')],
      { marketCode: 'KR' },
      9,
    )

    expect(JSON.stringify(result)).not.toContain('minji@buyer.test')
  })

  it('denies every action without the matching contacts grant', async () => {
    await expect(
      service.list(actor, [], { marketCode: 'KR' }, 9),
    ).rejects.toBeInstanceOf(AccessDeniedError)
    await expect(
      service.get(actor, [grant('list')], 9, 21),
    ).rejects.toBeInstanceOf(AccessDeniedError)
    await expect(
      service.listChannels(actor, [grant('read')], 9, 21),
    ).rejects.toBeInstanceOf(AccessDeniedError)
    expect(repository.list).not.toHaveBeenCalled()
    expect(repository.get).not.toHaveBeenCalled()
    expect(repository.listChannels).not.toHaveBeenCalled()
  })

  it('requires the sensitive-read action for channels and preferences', async () => {
    repository.listChannels.mockResolvedValue([])
    repository.listPreferences.mockResolvedValue([])

    await service.listChannels(actor, [grant('sensitive-read')], 9, 21)
    await service.listPreferences(actor, [grant('sensitive-read')], 9, 21)

    expect(repository.listChannels).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'OWN', id: 21 }),
    )
    expect(repository.listPreferences).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'OWN', id: 21 }),
    )
  })

  it('rejects a write field the grant does not permit', async () => {
    await expect(
      service.create(
        actor,
        [grant('create', 'OWN', ['id'], ['displayName'])],
        9,
        {
          customerId: 4,
          displayName: 'Kim Minji',
          department: 'Procurement',
        },
        'request-1',
      ),
    ).rejects.toBeInstanceOf(AccessDeniedError)
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('returns a frozen historical projection for an entitled former owner', async () => {
    repository.get.mockResolvedValue({
      contact: {
        id: 21,
        customerId: 4,
        displayName: 'Kim Minji (at handover)',
        version: 2,
      },
      primaryContexts: ['procurement'],
      historical: true,
      transferredAt: new Date('2026-11-01T00:00:00Z'),
    })

    const result = await service.get(actor, [grant('read')], 9, 21)

    expect(result.historical).toBe(true)
    expect(result).toMatchObject({ displayName: 'Kim Minji (at handover)' })
    expect(result).toHaveProperty('transferredAt')
  })

  it('filters the timeline through the audit safe-diff allowlist', async () => {
    repository.timeline.mockResolvedValue({
      items: [
        {
          id: 5,
          action: 'contact.updated',
          result: 'SUCCESS',
          occurredAt: new Date('2026-11-10T00:00:00Z'),
          safeDiff: {
            changedFields: ['displayName'],
            handle: 'minji@buyer.test',
          },
        },
      ],
      nextCursor: null,
    })

    const result = await service.timeline(actor, [grant('read')], 9, 21, {})

    expect(result.items[0].safeDiff).toEqual({ changedFields: ['displayName'] })
    expect(JSON.stringify(result)).not.toContain('minji@buyer.test')
  })

  it('requires an explicit expectedVersion for child mutations', async () => {
    await expect(
      service.createChannel(
        actor,
        [grant('edit', 'OWN', ['id'], ['channels'])],
        9,
        21,
        { kind: 'email', handle: 'a@b.test' },
        'request-2',
      ),
    ).rejects.toThrow('expectedVersion is required')
  })
})
