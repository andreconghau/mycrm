import { describe, expect, it } from 'vitest'
import { openApiDocument } from './openapi'

const expectedOperations = [
  'get /api/v1/admin/role-grants',
  'get /api/v1/admin/users',
  'get /api/v1/audit-events',
  'get /api/v1/me',
  'get /api/v1/me/permissions',
  'post /api/v1/admin/markets/{id}/memberships',
  'post /api/v1/admin/teams',
  'post /api/v1/admin/teams/{id}/members',
  'post /api/v1/admin/users/{id}/disable',
  'post /api/v1/admin/users/{id}/roles',
  'post /api/v1/auth/invitations/accept',
  'post /api/v1/auth/login',
  'post /api/v1/auth/logout',
  'post /api/v1/auth/refresh',
]

describe('OpenAPI document', () => {
  it('publishes exactly the implemented access-control operations', () => {
    const operations = Object.entries(openApiDocument.paths)
      .flatMap(([path, methods]) =>
        Object.keys(methods).map((method) => `${method} ${path}`),
      )
      .sort()

    expect(operations).toEqual(expectedOperations)
    expect(
      operations.some((operation) => operation.includes('customers')),
    ).toBe(false)
  })

  it('uses OpenAPI 3.1 with unique operation IDs', () => {
    const operationIds = Object.values(openApiDocument.paths).flatMap(
      (methods) =>
        Object.values(methods).map((operation) => operation.operationId),
    )

    expect(openApiDocument.openapi).toBe('3.1.0')
    expect(new Set(operationIds).size).toBe(expectedOperations.length)
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
