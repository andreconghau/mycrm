import {
  assignTeamMemberRequestSchema,
  createTeamRequestSchema,
  disableUserRequestSchema,
  invitationAcceptanceRequestSchema,
  loginRequestSchema,
  marketMembershipRequestSchema,
  roleAssignmentRequestSchema,
  selfProfileRequestSchema,
} from '@/modules/access-control/application/api-contracts'
import { recordScopes, roleCodes } from '@/modules/access-control/domain/types'
import { auditQuerySchema } from '@/modules/access-control/application/audit-contracts'
import {
  archiveCustomerSchema,
  createCustomerSchema,
  reassignCustomerSchema,
  updateCustomerSchema,
} from '@/modules/customers/application/contracts'
import {
  channelInputSchema,
  contactDuplicateCandidatesSchema,
  createContactSchema,
  deactivateContactSchema,
  preferenceInputSchema,
  setPrimaryContactSchema,
  transferContactSchema,
  updateChannelSchema,
  updateContactSchema,
  updatePreferenceSchema,
} from '@/modules/contacts/application/contracts'
import {
  createProductSchema,
  productStatuses,
  productUnits,
  transitionProductSchema,
  updateProductSchema,
} from '@/modules/products/application/contracts'
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
const childIdParameter = parameterRef('PositiveChildId')
const marketParameter = {
  name: 'market',
  in: 'query',
  required: true,
  schema: { type: 'string', minLength: 2, maxLength: 32 },
} as const

const positiveInteger = {
  type: 'integer',
  format: 'int64',
  minimum: 1,
} as const

const paths = {
  '/api/v1/customers': {
    get: {
      operationId: 'listCustomers',
      tags: ['Customers'],
      summary: 'List market-scoped customers',
      description:
        'Requires customers:read and current market membership. Record scope is applied on the server before pagination.',
      security: cookieSecurity,
      parameters: [
        { name: 'market', in: 'query', required: true, schema: { type: 'string', minLength: 2, maxLength: 32 } },
        { name: 'q', in: 'query', schema: { type: 'string', maxLength: 120 } },
        { name: 'country', in: 'query', schema: { type: 'string', pattern: '^[A-Z]{2}$' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['PROSPECT', 'ACTIVE', 'ON_HOLD', 'INACTIVE', 'ARCHIVED'] } },
        { name: 'owner', in: 'query', schema: positiveInteger },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
        { name: 'cursor', in: 'query', schema: { type: 'string', maxLength: 512 } },
      ],
      responses: {
        '200': jsonResponse('Scoped customer page and entitled history snapshots.', dataEnvelope({ type: 'object', required: ['items', 'historyItems', 'nextCursor'], properties: { items: { type: 'array', items: schemaRef('Customer') }, historyItems: { type: 'array', items: schemaRef('CustomerHistory') }, nextCursor: { type: ['string', 'null'] } }, additionalProperties: false })),
        ...commonErrors,
      },
    },
    post: {
      operationId: 'createCustomer',
      tags: ['Customers'],
      summary: 'Create a buyer customer',
      description: 'Requires customers:create, current market membership and CSRF proof. Duplicate identifiers are not merged.',
      security: cookieSecurity,
      parameters: [{ name: 'market', in: 'query', required: true, schema: { type: 'string' } }, csrfParameter],
      requestBody: jsonBody('CreateCustomerRequest'),
      responses: { '201': jsonResponse('Customer created.', dataEnvelope(schemaRef('Customer'))), ...commonErrors },
    },
  },
  '/api/v1/customers/{id}': {
    get: {
      operationId: 'getCustomer',
      tags: ['Customers'],
      summary: 'Read a customer or entitled historical snapshot',
      security: cookieSecurity,
      parameters: [idParameter, { name: 'market', in: 'query', required: true, schema: { type: 'string' } }],
      responses: { '200': jsonResponse('Customer projection filtered by read-field grants.', dataEnvelope(schemaRef('CustomerDetail'))), ...commonErrors, '404': responseRef('NotFound') },
    },
    patch: {
      operationId: 'updateCustomer',
      tags: ['Customers'],
      summary: 'Update a customer with optimistic concurrency',
      security: cookieSecurity,
      parameters: [idParameter, { name: 'market', in: 'query', required: true, schema: { type: 'string' } }, csrfParameter],
      requestBody: jsonBody('UpdateCustomerRequest'),
      responses: { '200': jsonResponse('Customer updated.', dataEnvelope(schemaRef('Customer'))), ...commonErrors, '409': responseRef('Conflict') },
    },
  },
  '/api/v1/customers/{id}/archive': {
    post: {
      operationId: 'archiveCustomer',
      tags: ['Customers'],
      summary: 'Archive a customer while preserving history',
      security: cookieSecurity,
      parameters: [idParameter, { name: 'market', in: 'query', required: true, schema: { type: 'string' } }, csrfParameter],
      requestBody: jsonBody('ArchiveCustomerRequest'),
      responses: { '200': jsonResponse('Customer archived.', dataEnvelope(schemaRef('Customer'))), ...commonErrors, '409': responseRef('Conflict') },
    },
  },
  '/api/v1/customers/{id}/reassign': {
    post: {
      operationId: 'reassignCustomerOwner',
      tags: ['Customers'],
      summary: 'Transfer customer ownership with an audited snapshot',
      security: cookieSecurity,
      parameters: [idParameter, { name: 'market', in: 'query', required: true, schema: { type: 'string' } }, csrfParameter],
      requestBody: jsonBody('ReassignCustomerRequest'),
      responses: { '200': jsonResponse('Customer reassigned.', dataEnvelope(schemaRef('Customer'))), ...commonErrors, '409': responseRef('Conflict') },
    },
  },
  '/api/v1/customers/duplicate-candidates': {
    post: {
      operationId: 'findCustomerDuplicateCandidates',
      tags: ['Customers'],
      summary: 'Find in-scope identifier matches in the same market',
      security: cookieSecurity,
      parameters: [{ name: 'market', in: 'query', required: true, schema: { type: 'string' } }, csrfParameter],
      requestBody: jsonBody('DuplicateCandidatesRequest'),
      responses: { '200': jsonResponse('Candidate records for human review; no automatic merge.', dataEnvelope({ type: 'array', items: schemaRef('Customer') })), ...commonErrors },
    },
  },
  '/api/v1/contacts': {
    get: {
      operationId: 'listContacts',
      tags: ['Contacts'],
      summary: 'List buyer contacts within the authorized parent scope',
      description:
        'Requires contacts:list and current market membership. Record scope is derived from the parent customer before pagination. Channel handles are never included.',
      security: cookieSecurity,
      parameters: [
        marketParameter,
        { name: 'customerId', in: 'query', schema: positiveInteger },
        { name: 'active', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
        { name: 'q', in: 'query', schema: { type: 'string', maxLength: 120 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
        { name: 'cursor', in: 'query', schema: { type: 'string', maxLength: 512 } },
      ],
      responses: {
        '200': jsonResponse('Scoped contact page and entitled history snapshots.', dataEnvelope({ type: 'object', required: ['items', 'historyItems', 'nextCursor'], properties: { items: { type: 'array', items: schemaRef('Contact') }, historyItems: { type: 'array', items: schemaRef('ContactHistory') }, nextCursor: { type: ['string', 'null'] } }, additionalProperties: false })),
        ...commonErrors,
      },
    },
    post: {
      operationId: 'createContact',
      tags: ['Contacts'],
      summary: 'Create a contact under an authorized buyer',
      description:
        'Requires contacts:create, parent-customer scope and CSRF proof. A normalized channel match is only a warning; duplicate people are never merged.',
      security: cookieSecurity,
      parameters: [marketParameter, csrfParameter],
      requestBody: jsonBody('CreateContactRequest'),
      responses: { '201': jsonResponse('Contact created.', dataEnvelope(schemaRef('Contact'))), ...commonErrors, '404': responseRef('NotFound') },
    },
  },
  '/api/v1/contacts/{id}': {
    get: {
      operationId: 'getContact',
      tags: ['Contacts'],
      summary: 'Read a contact or an entitled frozen snapshot',
      description:
        'Direct lookup cannot bypass parent scope. A former owner receives the handover-time snapshot, never live data.',
      security: cookieSecurity,
      parameters: [idParameter, marketParameter],
      responses: { '200': jsonResponse('Contact projection filtered by read-field grants.', dataEnvelope(schemaRef('ContactDetail'))), ...commonErrors, '404': responseRef('NotFound') },
    },
    patch: {
      operationId: 'updateContact',
      tags: ['Contacts'],
      summary: 'Update allowlisted contact fields with optimistic concurrency',
      description:
        'customerId and marketId are not accepted; moving a contact requires the explicit transfer command.',
      security: cookieSecurity,
      parameters: [idParameter, marketParameter, csrfParameter],
      requestBody: jsonBody('UpdateContactRequest'),
      responses: { '200': jsonResponse('Contact updated.', dataEnvelope(schemaRef('Contact'))), ...commonErrors, '404': responseRef('NotFound'), '409': responseRef('Conflict') },
    },
  },
  '/api/v1/contacts/{id}/channels': {
    get: {
      operationId: 'listContactChannels',
      tags: ['Contacts'],
      summary: 'Read permitted contact channels',
      description: 'Requires contacts:sensitive-read in addition to parent scope.',
      security: cookieSecurity,
      parameters: [idParameter, marketParameter],
      responses: { '200': jsonResponse('Channels for the contact.', dataEnvelope({ type: 'array', items: schemaRef('ContactChannel') })), ...commonErrors, '404': responseRef('NotFound') },
    },
    post: {
      operationId: 'createContactChannel',
      tags: ['Contacts'],
      summary: 'Record an explicit contact channel',
      description:
        'Requires contacts:edit and the parent contact version. verifiedAt is never client-settable.',
      security: cookieSecurity,
      parameters: [idParameter, marketParameter, csrfParameter],
      requestBody: jsonBody('ContactChannelRequest'),
      responses: { '201': jsonResponse('Channel recorded.', dataEnvelope(schemaRef('ContactChannelResult'))), ...commonErrors, '404': responseRef('NotFound'), '409': responseRef('Conflict') },
    },
  },
  '/api/v1/contacts/{id}/channels/{childId}': {
    patch: {
      operationId: 'updateContactChannel',
      tags: ['Contacts'],
      summary: 'Update a contact channel',
      security: cookieSecurity,
      parameters: [idParameter, childIdParameter, marketParameter, csrfParameter],
      requestBody: jsonBody('UpdateContactChannelRequest'),
      responses: { '200': jsonResponse('Channel updated.', dataEnvelope(schemaRef('ContactChannelResult'))), ...commonErrors, '404': responseRef('NotFound'), '409': responseRef('Conflict') },
    },
  },
  '/api/v1/contacts/{id}/preferences': {
    get: {
      operationId: 'listContactPreferences',
      tags: ['Contacts'],
      summary: 'Read recorded communication preferences',
      description: 'Requires contacts:sensitive-read. Consent is never inferred from absence.',
      security: cookieSecurity,
      parameters: [idParameter, marketParameter],
      responses: { '200': jsonResponse('Preferences for the contact.', dataEnvelope({ type: 'array', items: schemaRef('ContactPreference') })), ...commonErrors, '404': responseRef('NotFound') },
    },
    post: {
      operationId: 'recordContactPreference',
      tags: ['Contacts'],
      summary: 'Record an explicit communication preference',
      description:
        'An evidenceFileId must reference a same-market file whose scan state is CLEAN, otherwise the request is rejected as 422.',
      security: cookieSecurity,
      parameters: [idParameter, marketParameter, csrfParameter],
      requestBody: jsonBody('ContactPreferenceRequest'),
      responses: { '201': jsonResponse('Preference recorded.', dataEnvelope(schemaRef('ContactPreferenceResult'))), ...commonErrors, '404': responseRef('NotFound'), '409': responseRef('Conflict'), '422': responseRef('BusinessRuleViolation') },
    },
  },
  '/api/v1/contacts/{id}/preferences/{childId}': {
    patch: {
      operationId: 'updateContactPreference',
      tags: ['Contacts'],
      summary: 'Update a recorded communication preference',
      security: cookieSecurity,
      parameters: [idParameter, childIdParameter, marketParameter, csrfParameter],
      requestBody: jsonBody('UpdateContactPreferenceRequest'),
      responses: { '200': jsonResponse('Preference updated.', dataEnvelope(schemaRef('ContactPreferenceResult'))), ...commonErrors, '404': responseRef('NotFound'), '409': responseRef('Conflict'), '422': responseRef('BusinessRuleViolation') },
    },
  },
  '/api/v1/contacts/{id}/set-primary': {
    post: {
      operationId: 'setPrimaryContact',
      tags: ['Contacts'],
      summary: 'Designate the primary contact for one buyer context',
      description:
        'Contexts are independent. Changing a primary never deletes prior correspondence or affects existing orders.',
      security: cookieSecurity,
      parameters: [idParameter, marketParameter, csrfParameter],
      requestBody: jsonBody('SetPrimaryContactRequest'),
      responses: { '200': jsonResponse('Primary designation recorded.', dataEnvelope(schemaRef('ContactDetail'))), ...commonErrors, '404': responseRef('NotFound'), '409': responseRef('Conflict') },
    },
  },
  '/api/v1/contacts/{id}/deactivate': {
    post: {
      operationId: 'deactivateContact',
      tags: ['Contacts'],
      summary: 'Deactivate a contact while preserving history',
      description: 'There is no delete operation; historical references remain intact.',
      security: cookieSecurity,
      parameters: [idParameter, marketParameter, csrfParameter],
      requestBody: jsonBody('DeactivateContactRequest'),
      responses: { '200': jsonResponse('Contact deactivated.', dataEnvelope(schemaRef('Contact'))), ...commonErrors, '404': responseRef('NotFound'), '409': responseRef('Conflict') },
    },
  },
  '/api/v1/contacts/{id}/transfer': {
    post: {
      operationId: 'transferContact',
      tags: ['Contacts'],
      summary: 'Move a contact to another authorized buyer',
      description:
        'Requires contacts:edit on both the source and the destination customer. An inaccessible destination is reported as 404.',
      security: cookieSecurity,
      parameters: [idParameter, marketParameter, csrfParameter],
      requestBody: jsonBody('TransferContactRequest'),
      responses: { '200': jsonResponse('Contact transferred.', dataEnvelope(schemaRef('Contact'))), ...commonErrors, '404': responseRef('NotFound'), '409': responseRef('Conflict') },
    },
  },
  '/api/v1/contacts/{id}/timeline': {
    get: {
      operationId: 'getContactTimeline',
      tags: ['Contacts'],
      summary: 'Read the audited contact timeline',
      description:
        'Derived from audit events for this contact and filtered through the safe-diff allowlist; inherits parent scope.',
      security: cookieSecurity,
      parameters: [
        idParameter,
        marketParameter,
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
        { name: 'cursor', in: 'query', schema: { type: 'string', maxLength: 512 } },
      ],
      responses: { '200': jsonResponse('Audited contact timeline page.', dataEnvelope({ type: 'object', required: ['items', 'nextCursor'], properties: { items: { type: 'array', items: schemaRef('ContactTimelineEvent') }, nextCursor: { type: ['string', 'null'] } }, additionalProperties: false })), ...commonErrors, '404': responseRef('NotFound') },
    },
  },
  '/api/v1/contacts/duplicate-candidates': {
    post: {
      operationId: 'findContactDuplicateCandidates',
      tags: ['Contacts'],
      summary: 'Find in-scope normalized channel matches in the same market',
      description:
        'Warning only. Two distinct people at the same buyer may share an email; candidates outside the caller scope are never returned.',
      security: cookieSecurity,
      parameters: [marketParameter, csrfParameter],
      responses: { '200': jsonResponse('Candidate contacts for human review; no automatic merge.', dataEnvelope({ type: 'array', items: schemaRef('ContactDuplicateCandidate') })), ...commonErrors },
      requestBody: jsonBody('ContactDuplicateCandidatesRequest'),
    },
  },
  '/api/v1/products': {
    get: {
      operationId: 'listProducts',
      tags: ['Products'],
      summary: 'List the global product catalog',
      description:
        'Requires products:read. The catalog is not market-scoped. DRAFT products are visible per read grant but are never eligible for new commercial line selection.',
      security: cookieSecurity,
      parameters: [
        { name: 'q', in: 'query', schema: { type: 'string', maxLength: 120 } },
        { name: 'category', in: 'query', schema: { type: 'string', maxLength: 120 } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: productStatuses } },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
        { name: 'cursor', in: 'query', schema: { type: 'string', maxLength: 512 } },
      ],
      responses: {
        '200': jsonResponse('Product catalog page.', dataEnvelope({ type: 'object', required: ['items', 'nextCursor'], properties: { items: { type: 'array', items: schemaRef('Product') }, nextCursor: { type: ['string', 'null'] } }, additionalProperties: false })),
        ...commonErrors,
      },
    },
    post: {
      operationId: 'createProduct',
      tags: ['Products'],
      summary: 'Create a DRAFT product',
      description:
        'Requires products:create and CSRF proof. New products start DRAFT and are not eligible for commercial lines until approved.',
      security: cookieSecurity,
      parameters: [csrfParameter],
      requestBody: jsonBody('CreateProductRequest'),
      responses: { '201': jsonResponse('Product created.', dataEnvelope(schemaRef('Product'))), ...commonErrors },
    },
  },
  '/api/v1/products/{id}': {
    get: {
      operationId: 'getProduct',
      tags: ['Products'],
      summary: 'Read a product',
      security: cookieSecurity,
      parameters: [idParameter],
      responses: { '200': jsonResponse('Product projection filtered by read-field grants.', dataEnvelope(schemaRef('Product'))), ...commonErrors, '404': responseRef('NotFound') },
    },
    patch: {
      operationId: 'updateProduct',
      tags: ['Products'],
      summary: 'Update product attributes with optimistic concurrency',
      description:
        'Does not change sku or status. Renames/attribute changes never alter prior quotation/order snapshots.',
      security: cookieSecurity,
      parameters: [idParameter, csrfParameter],
      requestBody: jsonBody('UpdateProductRequest'),
      responses: { '200': jsonResponse('Product updated.', dataEnvelope(schemaRef('Product'))), ...commonErrors, '404': responseRef('NotFound'), '409': responseRef('Conflict') },
    },
  },
  '/api/v1/products/{id}/approve': {
    post: {
      operationId: 'approveProduct',
      tags: ['Products'],
      summary: 'Approve a DRAFT product for commercial use (DRAFT -> ACTIVE)',
      description: 'Requires products:approve.',
      security: cookieSecurity,
      parameters: [idParameter, csrfParameter],
      requestBody: jsonBody('TransitionProductRequest'),
      responses: { '200': jsonResponse('Product approved.', dataEnvelope(schemaRef('Product'))), ...commonErrors, '404': responseRef('NotFound'), '409': responseRef('Conflict') },
    },
  },
  '/api/v1/products/{id}/retire': {
    post: {
      operationId: 'retireProduct',
      tags: ['Products'],
      summary: 'Retire an ACTIVE product (ACTIVE -> INACTIVE)',
      description:
        'Requires products:retire. Removes eligibility for new commercial lines; existing quotation/order references are unaffected.',
      security: cookieSecurity,
      parameters: [idParameter, csrfParameter],
      requestBody: jsonBody('TransitionProductRequest'),
      responses: { '200': jsonResponse('Product retired.', dataEnvelope(schemaRef('Product'))), ...commonErrors, '404': responseRef('NotFound'), '409': responseRef('Conflict') },
    },
  },
  '/api/v1/products/{id}/reactivate': {
    post: {
      operationId: 'reactivateProduct',
      tags: ['Products'],
      summary: 'Reactivate a retired product (INACTIVE -> ACTIVE)',
      description: 'Requires products:approve.',
      security: cookieSecurity,
      parameters: [idParameter, csrfParameter],
      requestBody: jsonBody('TransitionProductRequest'),
      responses: { '200': jsonResponse('Product reactivated.', dataEnvelope(schemaRef('Product'))), ...commonErrors, '404': responseRef('NotFound'), '409': responseRef('Conflict') },
    },
  },
  '/api/v1/audit-events': {
    get: {
      operationId: 'listAuditEvents',
      tags: ['Audit log'],
      summary: 'List audit events',
      description:
        'Administrator role required. Results are read-only and cursor-paginated.',
      security: cookieSecurity,
      parameters: [
        { name: 'actorId', in: 'query', schema: positiveInteger },
        {
          name: 'resourceType',
          in: 'query',
          schema: { type: 'string', maxLength: 80 },
        },
        { name: 'resourceId', in: 'query', schema: positiveInteger },
        {
          name: 'action',
          in: 'query',
          schema: { type: 'string', maxLength: 120 },
        },
        {
          name: 'from',
          in: 'query',
          schema: { type: 'string', format: 'date-time' },
        },
        {
          name: 'to',
          in: 'query',
          schema: { type: 'string', format: 'date-time' },
        },
        {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
        },
        {
          name: 'cursor',
          in: 'query',
          schema: { type: 'string', maxLength: 512 },
        },
      ],
      responses: {
        '200': jsonResponse(
          'Cursor page of safe audit event projections.',
          dataEnvelope({
            type: 'object',
            required: ['items', 'nextCursor'],
            properties: {
              items: { type: 'array', items: schemaRef('AuditEvent') },
              nextCursor: { type: ['string', 'null'] },
            },
            additionalProperties: false,
          }),
        ),
        ...commonErrors,
      },
    },
  },
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
    patch: {
      operationId: 'updateOwnProfile',
      tags: ['Current user'],
      summary: 'Update the active user display name',
      description: 'Updates only the authenticated user displayName. Email and role changes are not accepted.',
      security: cookieSecurity,
      parameters: [csrfParameter],
      requestBody: jsonBody('SelfProfileRequest'),
      responses: {
        '200': jsonResponse(
          'Current user profile updated.',
          dataEnvelope({
            type: 'object',
            required: ['displayName'],
            properties: { displayName: { type: 'string' } },
            additionalProperties: false,
          }),
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
  '/api/v1/me/markets': {
    get: {
      operationId: 'listMyMarkets',
      tags: ['Customers'],
      summary: 'List active markets for the authenticated employee',
      description: 'Returns only active market memberships from the server-side principal.',
      security: cookieSecurity,
      responses: {
        '200': jsonResponse('Authorized market options.', dataEnvelope({ type: 'array', items: { type: 'object', required: ['id', 'code', 'nameEn', 'nameVi', 'defaultCurrency'], properties: { id: positiveInteger, code: { type: 'string' }, nameEn: { type: 'string' }, nameVi: { type: 'string' }, defaultCurrency: { type: 'string' } }, additionalProperties: false } })),
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
    { name: 'Customers' },
    { name: 'Contacts' },
    { name: 'Products' },
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
      PositiveChildId: {
        name: 'childId',
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
      NotFound: jsonResponse('Customer is unavailable in the authorized scope.', errorSchema),
      Conflict: jsonResponse('The record changed or a business transition is invalid.', errorSchema),
      BusinessRuleViolation: jsonResponse('The authorized record failed a business prerequisite.', errorSchema),
    },
    schemas: {
      AuditQuery: fromZod(auditQuerySchema),
      CreateCustomerRequest: fromZod(createCustomerSchema),
      UpdateCustomerRequest: fromZod(updateCustomerSchema),
      ArchiveCustomerRequest: fromZod(archiveCustomerSchema),
      ReassignCustomerRequest: fromZod(reassignCustomerSchema),
      DuplicateCandidatesRequest: {
        type: 'object',
        required: ['identifiers'],
        properties: {
          customerId: positiveInteger,
          identifiers: { type: 'array', maxItems: 50, items: { type: 'object', required: ['kind', 'value'], properties: { kind: { type: 'string', minLength: 1, maxLength: 60 }, value: { type: 'string', minLength: 1, maxLength: 240 } }, additionalProperties: false } },
        },
        additionalProperties: false,
      },
      Customer: {
        type: 'object',
        properties: {
          id: positiveInteger, code: { type: 'string' }, legalName: { type: 'string' }, tradeName: { type: ['string', 'null'] }, countryCode: { type: 'string', pattern: '^[A-Z]{2}$' }, preferredLanguage: { type: ['string', 'null'] }, preferredCurrency: { type: ['string', 'null'] }, website: { type: ['string', 'null'], format: 'uri' }, status: { type: 'string', enum: ['PROSPECT', 'ACTIVE', 'ON_HOLD', 'INACTIVE', 'ARCHIVED'] }, ownerId: positiveInteger, teamId: { type: ['integer', 'null'] }, version: { type: 'integer', minimum: 1 },
        },
        additionalProperties: false,
      },
      CustomerDetail: {
        type: 'object',
        properties: {
          id: positiveInteger, code: { type: 'string' }, legalName: { type: 'string' }, tradeName: { type: ['string', 'null'] }, countryCode: { type: 'string', pattern: '^[A-Z]{2}$' }, preferredLanguage: { type: ['string', 'null'] }, preferredCurrency: { type: ['string', 'null'] }, website: { type: ['string', 'null'], format: 'uri' }, status: { type: 'string', enum: ['PROSPECT', 'ACTIVE', 'ON_HOLD', 'INACTIVE', 'ARCHIVED'] }, ownerId: positiveInteger, teamId: { type: ['integer', 'null'] }, version: { type: 'integer', minimum: 1 }, addresses: { type: 'array', items: { type: 'object' } }, identifiers: { type: 'array', items: { type: 'object' } }, historical: { type: 'boolean' },
        },
        additionalProperties: false,
      },
      CustomerHistory: {
        type: 'object',
        properties: {
          id: positiveInteger, code: { type: 'string' }, legalName: { type: 'string' }, tradeName: { type: ['string', 'null'] }, countryCode: { type: 'string', pattern: '^[A-Z]{2}$' }, preferredLanguage: { type: ['string', 'null'] }, preferredCurrency: { type: ['string', 'null'] }, website: { type: ['string', 'null'], format: 'uri' }, status: { type: 'string', enum: ['PROSPECT', 'ACTIVE', 'ON_HOLD', 'INACTIVE', 'ARCHIVED'] }, ownerId: positiveInteger, teamId: { type: ['integer', 'null'] }, version: { type: 'integer', minimum: 1 }, historical: { type: 'boolean', const: true }, transferredAt: { type: 'string', format: 'date-time' },
        },
        additionalProperties: false,
      },
      CreateContactRequest: fromZod(createContactSchema),
      UpdateContactRequest: fromZod(updateContactSchema),
      ContactChannelRequest: {
        allOf: [
          { type: 'object', required: ['version'], properties: { version: { type: 'integer', minimum: 1 } } },
          fromZod(channelInputSchema),
        ],
      },
      UpdateContactChannelRequest: fromZod(updateChannelSchema),
      ContactPreferenceRequest: {
        allOf: [
          { type: 'object', required: ['version'], properties: { version: { type: 'integer', minimum: 1 } } },
          fromZod(preferenceInputSchema),
        ],
      },
      UpdateContactPreferenceRequest: fromZod(updatePreferenceSchema),
      SetPrimaryContactRequest: fromZod(setPrimaryContactSchema),
      DeactivateContactRequest: fromZod(deactivateContactSchema),
      TransferContactRequest: fromZod(transferContactSchema),
      ContactDuplicateCandidatesRequest: fromZod(contactDuplicateCandidatesSchema),
      Contact: {
        type: 'object',
        properties: {
          id: positiveInteger,
          customerId: positiveInteger,
          customerLegalName: { type: 'string' },
          displayName: { type: 'string' },
          jobTitle: { type: ['string', 'null'] },
          department: { type: ['string', 'null'] },
          preferredLanguage: { type: ['string', 'null'] },
          timezone: { type: ['string', 'null'] },
          active: { type: 'boolean' },
          version: { type: 'integer', minimum: 1 },
        },
        additionalProperties: false,
      },
      ContactDetail: {
        allOf: [
          schemaRef('Contact'),
          {
            type: 'object',
            properties: {
              primaryContexts: { type: 'array', items: { type: 'string', enum: ['procurement', 'invoicing', 'consignee'] } },
              historical: { type: 'boolean' },
              transferredAt: { type: 'string', format: 'date-time' },
            },
          },
        ],
      },
      ContactHistory: {
        allOf: [
          schemaRef('Contact'),
          {
            type: 'object',
            properties: {
              historical: { type: 'boolean', const: true },
              transferredAt: { type: 'string', format: 'date-time' },
            },
          },
        ],
      },
      ContactChannel: {
        type: 'object',
        required: ['id', 'contactId', 'kind', 'handle', 'isPrimary', 'version'],
        properties: {
          id: positiveInteger,
          contactId: positiveInteger,
          kind: { type: 'string', enum: ['email', 'phone', 'whatsapp', 'kakao', 'line', 'other'] },
          handle: { type: 'string' },
          isPrimary: { type: 'boolean' },
          verifiedAt: { type: ['string', 'null'], format: 'date-time' },
          version: { type: 'integer', minimum: 1 },
        },
        additionalProperties: false,
      },
      ContactChannelResult: {
        type: 'object',
        required: ['channel', 'contact'],
        properties: { channel: schemaRef('ContactChannel'), contact: schemaRef('Contact') },
        additionalProperties: false,
      },
      ContactPreference: {
        type: 'object',
        required: ['id', 'contactId', 'purpose', 'allowed', 'recordedAt', 'version'],
        properties: {
          id: positiveInteger,
          contactId: positiveInteger,
          purpose: { type: 'string', enum: ['commercial', 'operational', 'marketing'] },
          allowed: { type: 'boolean' },
          evidenceFileId: { type: ['integer', 'null'] },
          recordedAt: { type: 'string', format: 'date-time' },
          version: { type: 'integer', minimum: 1 },
        },
        additionalProperties: false,
      },
      ContactPreferenceResult: {
        type: 'object',
        required: ['preference', 'contact'],
        properties: { preference: schemaRef('ContactPreference'), contact: schemaRef('Contact') },
        additionalProperties: false,
      },
      ContactTimelineEvent: {
        type: 'object',
        required: ['id', 'action', 'result', 'occurredAt'],
        properties: {
          id: positiveInteger,
          actorId: { type: ['integer', 'null'] },
          action: { type: 'string' },
          resourceVersion: { type: ['integer', 'null'] },
          reason: { type: ['string', 'null'] },
          safeDiff: { type: 'object', additionalProperties: true },
          result: { type: 'string' },
          occurredAt: { type: 'string', format: 'date-time' },
        },
        additionalProperties: false,
      },
      ContactDuplicateCandidate: {
        allOf: [
          schemaRef('Contact'),
          {
            type: 'object',
            properties: {
              matchedKind: { type: 'string' },
              sameCustomer: { type: 'boolean' },
            },
          },
        ],
      },
      AuditEvent: {
        type: 'object',
        required: [
          'id',
          'actorId',
          'action',
          'resourceType',
          'resourceId',
          'resourceVersion',
          'requestId',
          'reason',
          'safeDiff',
          'result',
          'occurredAt',
        ],
        properties: {
          id: positiveInteger,
          actorId: { type: ['integer', 'null'] },
          action: { type: 'string' },
          resourceType: { type: 'string' },
          resourceId: { type: ['integer', 'null'] },
          resourceVersion: { type: ['integer', 'null'] },
          requestId: { type: 'string', format: 'uuid' },
          reason: { type: ['string', 'null'] },
          safeDiff: { type: 'object', additionalProperties: true },
          result: { type: 'string' },
          occurredAt: { type: 'string', format: 'date-time' },
        },
        additionalProperties: false,
      },
      LoginRequest: fromZod(loginRequestSchema),
      InvitationAcceptanceRequest: fromZod(invitationAcceptanceRequestSchema),
      RoleAssignmentRequest: fromZod(roleAssignmentRequestSchema),
      SelfProfileRequest: fromZod(selfProfileRequestSchema),
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
      CreateProductRequest: fromZod(createProductSchema),
      UpdateProductRequest: fromZod(updateProductSchema),
      TransitionProductRequest: fromZod(transitionProductSchema),
      Product: {
        type: 'object',
        required: ['id', 'sku', 'defaultUnit', 'status', 'version'],
        properties: {
          id: positiveInteger,
          sku: { type: 'string' },
          displayName: { type: 'string' },
          category: { type: ['string', 'null'] },
          speciesCommonName: { type: ['string', 'null'] },
          speciesScientificName: { type: ['string', 'null'] },
          productFamily: { type: ['string', 'null'] },
          defaultUnit: { type: 'string', enum: productUnits },
          status: { type: 'string', enum: productStatuses },
          descriptionEn: { type: ['string', 'null'] },
          descriptionVi: { type: ['string', 'null'] },
          descriptionKo: { type: ['string', 'null'] },
          names: {
            type: 'object',
            properties: { en: { type: 'string' }, vi: { type: 'string' }, ko: { type: 'string' } },
          },
          aliases: {
            type: 'array',
            items: { type: 'object', required: ['locale', 'label'], properties: { locale: { type: 'string' }, label: { type: 'string' } }, additionalProperties: false },
          },
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
