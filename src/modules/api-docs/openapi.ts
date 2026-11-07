import {
  assignTeamMemberRequestSchema,
  createTeamRequestSchema,
  disableUserRequestSchema,
  invitationAcceptanceRequestSchema,
  loginRequestSchema,
  marketMembershipRequestSchema,
  roleAssignmentRequestSchema,
} from '@/modules/access-control/application/api-contracts'
import { recordScopes, roleCodes } from '@/modules/access-control/domain/types'
import { z, type ZodType } from 'zod'

type Schema = Record<string, unknown>

function fromZod(schema: ZodType) {
  const converted = z.toJSONSchema(schema, {
    target: 'draft-2020-12',
    io: 'input',
  })
  Reflect.deleteProperty(converted, '$schema')
  return converted
}

const schemaRef = (name: string) => ({ $ref: `#/components/schemas/${name}` })
const responseRef = (name: string) => ({
  $ref: `#/components/responses/${name}`,
})
const parameterRef = (name: string) => ({
  $ref: `#/components/parameters/${name}`,
})
const dataEnvelope = (data: Schema): Schema => ({
  type: 'object',
  required: ['data'],
  properties: { data },
  additionalProperties: false,
})
const jsonBody = (name: string) => ({
  required: true,
  content: {
    'application/json': { schema: schemaRef(name) },
  },
})
const jsonResponse = (description: string, schema: Schema) => ({
  description,
  content: { 'application/json': { schema } },
})
const commonErrors = {
  '400': responseRef('ValidationError'),
  '401': responseRef('Unauthenticated'),
  '403': responseRef('Forbidden'),
  '500': responseRef('InternalError'),
}
const cookieSecurity = [{ accessCookie: [] }]
const refreshSecurity = [{ refreshCookie: [] }]
const csrfParameter = parameterRef('CsrfToken')
const idParameter = parameterRef('PositiveId')

const positiveInteger = {
  type: 'integer',
  format: 'int64',
  minimum: 1,
} as const

const paths = {
  '/api/v1/auth/login': {
    post: {
      operationId: 'login',
      tags: ['Authentication'],
      summary: 'Create an employee session',
      description:
        'Validates credentials, creates a server session and sets HttpOnly access/refresh cookies plus a readable signed CSRF cookie.',
      security: [],
      requestBody: jsonBody('LoginRequest'),
      responses: {
        '200': jsonResponse(
          'Authenticated session created.',
          dataEnvelope({
            type: 'object',
            required: ['user', 'accessExpiresAt'],
            properties: {
              user: {
                type: 'object',
                required: ['id', 'displayName'],
                properties: {
                  id: positiveInteger,
                  displayName: { type: 'string' },
                },
                additionalProperties: false,
              },
              accessExpiresAt: { type: 'string', format: 'date-time' },
            },
            additionalProperties: false,
          }),
        ),
        ...commonErrors,
      },
    },
  },
  '/api/v1/auth/invitations/accept': {
    post: {
      operationId: 'acceptInvitation',
      tags: ['Authentication'],
      summary: 'Accept an employee invitation',
      security: [],
      requestBody: jsonBody('InvitationAcceptanceRequest'),
      responses: {
        '200': jsonResponse(
          'Invitation accepted.',
          dataEnvelope({
            type: 'object',
            required: ['userId', 'acceptedAt'],
            properties: {
              userId: positiveInteger,
              acceptedAt: { type: 'string', format: 'date-time' },
            },
            additionalProperties: false,
          }),
        ),
        ...commonErrors,
      },
    },
  },
  '/api/v1/auth/refresh': {
    post: {
      operationId: 'refreshSession',
      tags: ['Authentication'],
      summary: 'Rotate the refresh credential',
      security: refreshSecurity,
      parameters: [csrfParameter],
      responses: {
        '200': jsonResponse(
          'Session refreshed and cookies rotated.',
          dataEnvelope({
            type: 'object',
            required: ['accessExpiresAt'],
            properties: {
              accessExpiresAt: { type: 'string', format: 'date-time' },
            },
            additionalProperties: false,
          }),
        ),
        ...commonErrors,
      },
    },
  },
  '/api/v1/auth/logout': {
    post: {
      operationId: 'logout',
      tags: ['Authentication'],
      summary: 'Revoke the current session',
      security: cookieSecurity,
      parameters: [csrfParameter],
      responses: {
        '204': { description: 'Session revoked and cookies cleared.' },
        ...commonErrors,
      },
    },
  },
  '/api/v1/me': {
    get: {
      operationId: 'getCurrentUser',
      tags: ['Current user'],
      summary: 'Read the active principal',
      security: cookieSecurity,
      responses: {
        '200': jsonResponse(
          'Current principal.',
          dataEnvelope(schemaRef('Principal')),
        ),
        ...commonErrors,
      },
    },
  },
  '/api/v1/me/permissions': {
    get: {
      operationId: 'getCurrentPermissions',
      tags: ['Current user'],
      summary: 'Read effective grants for the active principal',
      security: cookieSecurity,
      responses: {
        '200': jsonResponse(
          'Effective grants.',
          dataEnvelope({ type: 'array', items: schemaRef('EffectiveGrant') }),
        ),
        ...commonErrors,
      },
    },
  },
  '/api/v1/admin/users': {
    get: {
      operationId: 'listUsers',
      tags: ['Access administration'],
      summary: 'List employee accounts',
      description: 'Requires access.users:list.',
      security: cookieSecurity,
      parameters: [
        {
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
        },
      ],
      responses: {
        '200': jsonResponse(
          'Employee accounts.',
          dataEnvelope({ type: 'array', items: schemaRef('UserSummary') }),
        ),
        ...commonErrors,
      },
    },
  },
  '/api/v1/admin/users/{id}/roles': {
    post: {
      operationId: 'setUserRole',
      tags: ['Access administration'],
      summary: 'Grant or revoke an employee role',
      description: 'Requires access.roles:manage.',
      security: cookieSecurity,
      parameters: [idParameter, csrfParameter],
      requestBody: jsonBody('RoleAssignmentRequest'),
      responses: {
        '200': jsonResponse(
          'Role assignment updated.',
          dataEnvelope({
            type: 'object',
            required: ['userId', 'roleCode', 'active'],
            properties: {
              userId: positiveInteger,
              roleCode: schemaRef('RoleCode'),
              active: { type: 'boolean' },
            },
            additionalProperties: false,
          }),
        ),
        ...commonErrors,
      },
    },
  },
  '/api/v1/admin/users/{id}/disable': {
    post: {
      operationId: 'disableUser',
      tags: ['Access administration'],
      summary: 'Disable an employee and revoke active sessions',
      description: 'Requires access.users:disable.',
      security: cookieSecurity,
      parameters: [idParameter, csrfParameter],
      requestBody: jsonBody('DisableUserRequest'),
      responses: {
        '200': jsonResponse(
          'Employee disabled.',
          dataEnvelope({
            type: 'object',
            required: ['id', 'status'],
            properties: {
              id: positiveInteger,
              status: { type: 'string', const: 'DISABLED' },
            },
            additionalProperties: false,
          }),
        ),
        ...commonErrors,
      },
    },
  },
  '/api/v1/admin/role-grants': {
    get: {
      operationId: 'listRoleGrants',
      tags: ['Access administration'],
      summary: 'List configured role grants',
      description: 'Requires access.grants:read.',
      security: cookieSecurity,
      responses: {
        '200': jsonResponse(
          'Role grants.',
          dataEnvelope({ type: 'array', items: schemaRef('RoleGrant') }),
        ),
        ...commonErrors,
      },
    },
  },
  '/api/v1/admin/teams': {
    post: {
      operationId: 'createTeam',
      tags: ['Access administration'],
      summary: 'Create an active team',
      description: 'Requires access.teams:manage.',
      security: cookieSecurity,
      parameters: [csrfParameter],
      requestBody: jsonBody('CreateTeamRequest'),
      responses: {
        '201': jsonResponse('Team created.', dataEnvelope(schemaRef('Team'))),
        ...commonErrors,
      },
    },
  },
  '/api/v1/admin/teams/{id}/members': {
    post: {
      operationId: 'assignTeamMember',
      tags: ['Access administration'],
      summary: 'Assign an active employee to an active team',
      description: 'Requires access.teams:manage.',
      security: cookieSecurity,
      parameters: [idParameter, csrfParameter],
      requestBody: jsonBody('AssignTeamMemberRequest'),
      responses: {
        '201': jsonResponse(
          'Team member assigned.',
          dataEnvelope({
            type: 'object',
            required: ['teamId', 'userId'],
            properties: {
              teamId: positiveInteger,
              userId: positiveInteger,
            },
            additionalProperties: false,
          }),
        ),
        ...commonErrors,
      },
    },
  },
  '/api/v1/admin/markets/{id}/memberships': {
    post: {
      operationId: 'setMarketMembership',
      tags: ['Access administration'],
      summary: 'Grant or revoke an employee market membership',
      description: 'Requires access.markets:manage.',
      security: cookieSecurity,
      parameters: [idParameter, csrfParameter],
      requestBody: jsonBody('MarketMembershipRequest'),
      responses: {
        '200': jsonResponse(
          'Market membership updated.',
          dataEnvelope({
            type: 'object',
            required: ['marketId', 'userId', 'active'],
            properties: {
              marketId: positiveInteger,
              userId: positiveInteger,
              active: { type: 'boolean' },
            },
            additionalProperties: false,
          }),
        ),
        ...commonErrors,
      },
    },
  },
} as const

const errorSchema = {
  type: 'object',
  required: ['error'],
  properties: {
    error: {
      type: 'object',
      required: ['code'],
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
} as const

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Seafood Export CRM API',
    version: '0.1.0',
    description:
      'Implemented R1 access-control API. Planned module contracts are intentionally excluded.',
  },
  servers: [{ url: '/', description: 'Same-origin CRM application' }],
  tags: [
    { name: 'Authentication' },
    { name: 'Current user' },
    { name: 'Access administration' },
  ],
  paths,
  components: {
    securitySchemes: {
      accessCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'crm_access',
        description:
          'HttpOnly access cookie supplied by the browser. Production uses the __Host- prefix.',
      },
      refreshCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'crm_refresh',
        description:
          'HttpOnly refresh cookie supplied by the browser. Production uses the __Host- prefix.',
      },
    },
    parameters: {
      PositiveId: {
        name: 'id',
        in: 'path',
        required: true,
        schema: positiveInteger,
      },
      CsrfToken: {
        name: 'X-CSRF-Token',
        in: 'header',
        required: true,
        description:
          'Signed double-submit token copied from the readable same-origin CSRF cookie. Swagger UI adds it automatically.',
        schema: { type: 'string', minLength: 1 },
      },
    },
    responses: {
      ValidationError: jsonResponse('Request validation failed.', errorSchema),
      Unauthenticated: jsonResponse(
        'Authentication is required or the session is inactive.',
        errorSchema,
      ),
      Forbidden: jsonResponse(
        'The authenticated principal lacks the required permission or CSRF proof.',
        errorSchema,
      ),
      InternalError: jsonResponse(
        'The request could not be completed.',
        errorSchema,
      ),
    },
    schemas: {
      LoginRequest: fromZod(loginRequestSchema),
      InvitationAcceptanceRequest: fromZod(invitationAcceptanceRequestSchema),
      RoleAssignmentRequest: fromZod(roleAssignmentRequestSchema),
      DisableUserRequest: fromZod(disableUserRequestSchema),
      CreateTeamRequest: fromZod(createTeamRequestSchema),
      AssignTeamMemberRequest: fromZod(assignTeamMemberRequestSchema),
      MarketMembershipRequest: fromZod(marketMembershipRequestSchema),
      RoleCode: { type: 'string', enum: roleCodes },
      RecordScope: { type: 'string', enum: recordScopes },
      Principal: {
        type: 'object',
        required: ['id', 'displayName', 'email', 'roles', 'marketIds'],
        properties: {
          id: positiveInteger,
          displayName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          roles: { type: 'array', items: schemaRef('RoleCode') },
          marketIds: { type: 'array', items: positiveInteger },
        },
        additionalProperties: false,
      },
      EffectiveGrant: {
        type: 'object',
        required: [
          'resource',
          'action',
          'recordScope',
          'readFields',
          'writeFields',
        ],
        properties: {
          resource: { type: 'string' },
          action: { type: 'string' },
          recordScope: schemaRef('RecordScope'),
          readFields: { type: 'array', items: { type: 'string' } },
          writeFields: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
      UserSummary: {
        type: 'object',
        required: ['id', 'email', 'displayName', 'status', 'version'],
        properties: {
          id: positiveInteger,
          email: { type: 'string', format: 'email' },
          displayName: { type: 'string' },
          status: {
            type: 'string',
            enum: ['INVITED', 'ACTIVE', 'DISABLED'],
          },
          version: { type: 'integer', minimum: 1 },
        },
        additionalProperties: false,
      },
      RoleGrant: {
        type: 'object',
        required: [
          'id',
          'roleCode',
          'resource',
          'action',
          'recordScope',
          'readFields',
          'writeFields',
          'active',
          'version',
        ],
        properties: {
          id: positiveInteger,
          roleCode: schemaRef('RoleCode'),
          resource: { type: 'string' },
          action: { type: 'string' },
          recordScope: schemaRef('RecordScope'),
          readFields: { type: 'array', items: { type: 'string' } },
          writeFields: { type: 'array', items: { type: 'string' } },
          active: { type: 'boolean' },
          version: { type: 'integer', minimum: 1 },
        },
        additionalProperties: false,
      },
      Team: {
        type: 'object',
        required: ['id', 'name', 'active', 'version'],
        properties: {
          id: positiveInteger,
          name: { type: 'string' },
          active: { type: 'boolean' },
          version: { type: 'integer', minimum: 1 },
        },
        additionalProperties: false,
      },
      Error: errorSchema,
    },
  },
} as const

export type OpenApiDocument = typeof openApiDocument
