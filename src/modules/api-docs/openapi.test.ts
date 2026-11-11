import { describe, expect, it } from 'vitest'
import { openApiDocument } from './openapi'

const expectedOperations = [
  'get /api/v1/customers',
  'get /api/v1/customers/{id}',
  'get /api/v1/admin/role-grants',
  'get /api/v1/admin/users',
  'get /api/v1/audit-events',
  'get /api/v1/me',
  'patch /api/v1/me',
  'get /api/v1/me/permissions',
  'get /api/v1/me/markets',
  'post /api/v1/admin/markets/{id}/memberships',
  'post /api/v1/admin/teams',
  'post /api/v1/admin/teams/{id}/members',
  'post /api/v1/admin/users/{id}/disable',
  'post /api/v1/admin/users/{id}/roles',
  'post /api/v1/customers',
  'post /api/v1/customers/duplicate-candidates',
  'post /api/v1/customers/{id}/archive',
  'post /api/v1/customers/{id}/reassign',
  'patch /api/v1/customers/{id}',
  'post /api/v1/auth/invitations/accept',
  'post /api/v1/auth/login',
  'post /api/v1/auth/logout',
  'post /api/v1/auth/refresh',
  'get /api/v1/contacts',
  'post /api/v1/contacts',
  'get /api/v1/contacts/{id}',
  'patch /api/v1/contacts/{id}',
  'get /api/v1/contacts/{id}/channels',
  'post /api/v1/contacts/{id}/channels',
  'patch /api/v1/contacts/{id}/channels/{childId}',
  'get /api/v1/contacts/{id}/preferences',
  'post /api/v1/contacts/{id}/preferences',
  'patch /api/v1/contacts/{id}/preferences/{childId}',
  'post /api/v1/contacts/{id}/set-primary',
  'post /api/v1/contacts/{id}/deactivate',
  'post /api/v1/contacts/{id}/transfer',
  'get /api/v1/contacts/{id}/timeline',
  'post /api/v1/contacts/duplicate-candidates',
  'get /api/v1/products',
  'post /api/v1/products',
  'get /api/v1/products/{id}',
  'patch /api/v1/products/{id}',
  'post /api/v1/products/{id}/approve',
  'post /api/v1/products/{id}/retire',
  'post /api/v1/products/{id}/reactivate',
  'get /api/v1/products/{id}/specifications',
  'post /api/v1/products/{id}/specifications',
  'get /api/v1/specifications',
  'get /api/v1/specifications/{id}',
  'post /api/v1/specifications/{id}/archive',
  'get /api/v1/specifications/{id}/compare-revisions',
  'get /api/v1/specifications/{id}/revisions',
  'post /api/v1/specifications/{id}/revisions',
  'patch /api/v1/specifications/{id}/revisions/{revisionNo}',
  'get /api/v1/specifications/{id}/revisions/{revisionNo}/documents',
  'post /api/v1/specifications/{id}/revisions/{revisionNo}/publish',
  'get /api/v1/specifications/{id}/revisions/{revisionNo}/snapshot',
]

describe('OpenAPI document', () => {
  it('publishes exactly the implemented API operations', () => {
    const operations = Object.entries(openApiDocument.paths)
      .flatMap(([path, methods]) =>
        Object.keys(methods).map((method) => `${method} ${path}`),
      )
      .sort()

    expect(operations).toEqual([...expectedOperations].sort())
    expect(operations.filter((operation) => operation.includes('customers'))).toHaveLength(7)
    expect(
      operations.filter((operation) => operation.includes('/contacts')),
    ).toHaveLength(15)
  })

  it('uses OpenAPI 3.1 with unique operation IDs', () => {
    const operationIds = Object.values(openApiDocument.paths).flatMap(
      (methods) =>
        Object.values(methods).map((operation) => operation.operationId),
    )

    expect(openApiDocument.openapi).toBe('3.1.0')
    expect(new Set(operationIds).size).toBe(expectedOperations.length)
  })

  it('documents the contact contract without exposing channel handles in lists', () => {
    const contact = openApiDocument.components.schemas.Contact
    const update = openApiDocument.components.schemas.UpdateContactRequest

    expect(Object.keys(contact.properties)).not.toContain('handle')
    expect(Object.keys(update.properties ?? {})).not.toContain('customerId')
    expect(Object.keys(update.properties ?? {})).not.toContain('marketId')
    expect(
      openApiDocument.paths['/api/v1/contacts/{id}/channels'].get.description,
    ).toContain('sensitive-read')
  })

  it('derives request schemas from runtime Zod contracts', () => {
    const login = openApiDocument.components.schemas.LoginRequest
    const assignment = openApiDocument.components.schemas.RoleAssignmentRequest

    expect(login).not.toHaveProperty('$schema')
    expect(login).toMatchObject({
      type: 'object',
      required: ['email', 'password'],
    })
    expect(assignment).toMatchObject({
      type: 'object',
      required: ['roleCode', 'active', 'reason'],
    })
  })

  it('documents the audit filter contract and administrator-only endpoint', () => {
    expect(openApiDocument.components.schemas.AuditQuery).toMatchObject({
      type: 'object',
      properties: { limit: { maximum: 100 } },
    })
    expect(
      openApiDocument.paths['/api/v1/audit-events'].get.description,
    ).toContain('Administrator role required')
  })

  it('documents cookie authentication and signed CSRF proof', () => {
    expect(openApiDocument.components.securitySchemes).toMatchObject({
      accessCookie: { type: 'apiKey', in: 'cookie' },
      refreshCookie: { type: 'apiKey', in: 'cookie' },
    })
    expect(openApiDocument.components.parameters.CsrfToken).toMatchObject({
      name: 'X-CSRF-Token',
      in: 'header',
      required: true,
    })
    expect(openApiDocument.paths['/api/v1/auth/login'].post.security).toEqual(
      [],
    )
  })
})
