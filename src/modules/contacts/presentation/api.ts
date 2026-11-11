import { z } from 'zod'
import {
  authErrorResponse,
  requireCsrf,
  requirePermission,
} from '@/modules/access-control/application/request-auth'
import { requestCorrelationId } from '@/modules/access-control/application/request-correlation'
import { positiveIdSchema } from '@/modules/access-control/application/api-contracts'
import type {
  EffectiveGrant,
  Principal,
} from '@/modules/access-control/domain/types'
import {
  ContactConflictError,
  ContactNotFoundError,
} from '../infrastructure/contact-repository'
import {
  ContactService,
  ContactVersionRequiredError,
} from '../application/contact-service'
import { contactMarketCodeSchema } from '../application/contracts'

const service = new ContactService()

function responseFor(error: unknown) {
  if (error instanceof ContactNotFoundError) {
    return Response.json(
      { error: { code: 'NOT_FOUND', message: 'Contact not found' } },
      { status: 404 },
    )
  }
  if (error instanceof ContactConflictError) {
    return Response.json(
      { error: { code: 'VERSION_CONFLICT', message: error.message } },
      { status: 409 },
    )
  }
  if (error instanceof ContactVersionRequiredError) {
    return Response.json(
      {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'expectedVersion is required',
        },
      },
      { status: 400 },
    )
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  ) {
    return Response.json(
      {
        error: {
          code: 'CONFLICT',
          message: 'A conflicting contact value already exists',
        },
      },
      { status: 409 },
    )
  }
  if (error instanceof Error) {
    const unprocessable: Record<string, string> = {
      CONTACT_EVIDENCE_FILE_INVALID:
        'The referenced consent evidence file is unavailable',
    }
    const conflicts: Record<string, string> = {
      CONTACT_INACTIVE: 'The contact is inactive and cannot be modified',
      CONTACT_TRANSFER_TARGET_UNCHANGED:
        'The contact already belongs to that buyer',
    }
    if (unprocessable[error.message]) {
      return Response.json(
        {
          error: {
            code: 'BUSINESS_RULE_VIOLATION',
            message: unprocessable[error.message],
          },
        },
        { status: 422 },
      )
    }
    if (conflicts[error.message]) {
      return Response.json(
        {
          error: {
            code: 'BUSINESS_RULE_VIOLATION',
            message: conflicts[error.message],
          },
        },
        { status: 409 },
      )
    }
    // An inaccessible parent or transfer destination must be indistinguishable
    // from a nonexistent record: never confirm that another buyer exists.
    if (
      error.message === 'CONTACT_PARENT_NOT_ACCESSIBLE' ||
      error.message === 'CONTACT_TRANSFER_TARGET_INVALID'
    ) {
      return Response.json(
        { error: { code: 'NOT_FOUND', message: 'Customer not found' } },
        { status: 404 },
      )
    }
  }
  return authErrorResponse(error)
}

async function protectedAction<T>(
  action: string,
  request: Request,
  fn: (context: {
    principal: Principal
    grants: EffectiveGrant[]
    marketId: number
  }) => Promise<T>,
  requireMutationCsrf = false,
  successStatus = 200,
) {
  try {
    const { principal, grants } = await requirePermission('contacts', action)
    if (requireMutationCsrf) await requireCsrf(request, principal.sessionId)
    const marketCode = contactMarketCodeSchema.parse(
      new URL(request.url).searchParams.get('market'),
    )
    const marketId = await service.resolveMarketId(principal, marketCode)
    const data = await fn({ principal, grants, marketId })
    return Response.json(
      { data },
      {
        status: successStatus,
        headers: { 'Cache-Control': 'private, no-store' },
      },
    )
  } catch (error) {
    return responseFor(error)
  }
}

async function jsonObject(request: Request) {
  const body: unknown = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new z.ZodError([])
  return body as Record<string, unknown>
}

export function listContacts(request: Request) {
  return protectedAction(
    'list',
    request,
    async ({ principal, grants, marketId }) => {
      const params = new URL(request.url).searchParams
      const query: Record<string, string> = Object.fromEntries(params.entries())
      query.marketCode = params.get('market') ?? ''
      delete query.market
      return service.list(principal, grants, query, marketId)
    },
  )
}

export function createContact(request: Request) {
  return protectedAction(
    'create',
    request,
    async ({ principal, grants, marketId }) =>
      service.create(
        principal,
        grants,
        marketId,
        await jsonObject(request),
        requestCorrelationId(request),
      ),
    true,
    201,
  )
}

export function getContact(request: Request, idValue: string) {
  return protectedAction(
    'read',
    request,
    async ({ principal, grants, marketId }) =>
      service.get(principal, grants, marketId, positiveIdSchema.parse(idValue)),
  )
}

export function updateContact(request: Request, idValue: string) {
  return protectedAction(
    'edit',
    request,
    async ({ principal, grants, marketId }) =>
      service.update(
        principal,
        grants,
        marketId,
        positiveIdSchema.parse(idValue),
        await jsonObject(request),
        requestCorrelationId(request),
      ),
    true,
  )
}

export function listContactChannels(request: Request, idValue: string) {
  return protectedAction(
    'sensitive-read',
    request,
    async ({ principal, grants, marketId }) =>
      service.listChannels(
        principal,
        grants,
        marketId,
        positiveIdSchema.parse(idValue),
      ),
  )
}

export function createContactChannel(request: Request, idValue: string) {
  return protectedAction(
    'edit',
    request,
    async ({ principal, grants, marketId }) =>
      service.createChannel(
        principal,
        grants,
        marketId,
        positiveIdSchema.parse(idValue),
        await jsonObject(request),
        requestCorrelationId(request),
      ),
    true,
    201,
  )
}

export function updateContactChannel(
  request: Request,
  idValue: string,
  childIdValue: string,
) {
  return protectedAction(
    'edit',
    request,
    async ({ principal, grants, marketId }) =>
      service.updateChannel(
        principal,
        grants,
        marketId,
        positiveIdSchema.parse(idValue),
        positiveIdSchema.parse(childIdValue),
        await jsonObject(request),
        requestCorrelationId(request),
      ),
    true,
  )
}

export function listContactPreferences(request: Request, idValue: string) {
  return protectedAction(
    'sensitive-read',
    request,
    async ({ principal, grants, marketId }) =>
      service.listPreferences(
        principal,
        grants,
        marketId,
        positiveIdSchema.parse(idValue),
      ),
  )
}

export function createContactPreference(request: Request, idValue: string) {
  return protectedAction(
    'edit',
    request,
    async ({ principal, grants, marketId }) =>
      service.upsertPreference(
        principal,
        grants,
        marketId,
        positiveIdSchema.parse(idValue),
        await jsonObject(request),
        requestCorrelationId(request),
      ),
    true,
    201,
  )
}

export function updateContactPreference(
  request: Request,
  idValue: string,
  childIdValue: string,
) {
  return protectedAction(
    'edit',
    request,
    async ({ principal, grants, marketId }) =>
      service.updatePreference(
        principal,
        grants,
        marketId,
        positiveIdSchema.parse(idValue),
        positiveIdSchema.parse(childIdValue),
        await jsonObject(request),
        requestCorrelationId(request),
      ),
    true,
  )
}

export function setPrimaryContact(request: Request, idValue: string) {
  return protectedAction(
    'edit',
    request,
    async ({ principal, grants, marketId }) =>
      service.setPrimary(
        principal,
        grants,
        marketId,
        positiveIdSchema.parse(idValue),
        await jsonObject(request),
        requestCorrelationId(request),
      ),
    true,
  )
}

export function deactivateContact(request: Request, idValue: string) {
  return protectedAction(
    'edit',
    request,
    async ({ principal, grants, marketId }) =>
      service.deactivate(
        principal,
        grants,
        marketId,
        positiveIdSchema.parse(idValue),
        await jsonObject(request),
        requestCorrelationId(request),
      ),
    true,
  )
}

export function transferContact(request: Request, idValue: string) {
  return protectedAction(
    'edit',
    request,
    async ({ principal, grants, marketId }) =>
      service.transfer(
        principal,
        grants,
        marketId,
        positiveIdSchema.parse(idValue),
        await jsonObject(request),
        requestCorrelationId(request),
      ),
    true,
  )
}

export function contactTimeline(request: Request, idValue: string) {
  return protectedAction(
    'read',
    request,
    async ({ principal, grants, marketId }) => {
      const params = new URL(request.url).searchParams
      const query: Record<string, string> = Object.fromEntries(params.entries())
      delete query.market
      return service.timeline(
        principal,
        grants,
        marketId,
        positiveIdSchema.parse(idValue),
        query,
      )
    },
  )
}

export function contactDuplicateCandidates(request: Request) {
  return protectedAction(
    'list',
    request,
    async ({ principal, grants, marketId }) =>
      service.duplicateCandidates(
        principal,
        grants,
        marketId,
        await jsonObject(request),
      ),
    true,
  )
}

export const contactApiErrors = responseFor
