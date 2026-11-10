import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

const identity = (name = 'id') =>
  integer(name).primaryKey().generatedByDefaultAsIdentity()

export const teams = pgTable('teams', {
  id: identity(),
  name: text('name').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  version: integer('version').notNull().default(1),
})

export const users = pgTable('users', {
  id: identity(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull(),
  passwordHash: text('password_hash'),
  status: text('status').notNull(),
  directManagerId: integer('direct_manager_id'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  version: integer('version').notNull().default(1),
})

export const sessions = pgTable(
  'sessions',
  {
    id: identity(),
    userId: integer('user_id').notNull(),
    tokenVerifierHash: text('token_verifier_hash').notNull(),
    absoluteExpiresAt: timestamp('absolute_expires_at', {
      withTimezone: true,
    }).notNull(),
    idleExpiresAt: timestamp('idle_expires_at', {
      withTimezone: true,
    }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (table) => [
    index('session_user_revocation').on(table.userId, table.revokedAt),
  ],
)

export const userRoles = pgTable(
  'user_roles',
  {
    id: identity(),
    userId: integer('user_id').notNull(),
    roleCode: text('role_code').notNull(),
    active: boolean('active').notNull().default(true),
    grantedBy: integer('granted_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (table) => [
    uniqueIndex('user_roles_user_role').on(table.userId, table.roleCode),
  ],
)

export const roleGrants = pgTable(
  'role_grants',
  {
    id: identity(),
    roleCode: text('role_code').notNull(),
    resource: text('resource').notNull(),
    action: text('action').notNull(),
    recordScope: text('record_scope').notNull(),
    readFields: text('read_fields').array().notNull().default([]),
    writeFields: text('write_fields').array().notNull().default([]),
    active: boolean('active').notNull().default(false),
    changedBy: integer('changed_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (table) => [
    uniqueIndex('role_grants_role_resource_action_scope').on(
      table.roleCode,
      table.resource,
      table.action,
      table.recordScope,
    ),
  ],
)

export const teamMemberships = pgTable('team_memberships', {
  id: identity(),
  userId: integer('user_id').notNull(),
  teamId: integer('team_id').notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const markets = pgTable('markets', {
  id: identity(),
  code: text('code').notNull(),
  nameEn: text('name_en').notNull(),
  nameVi: text('name_vi').notNull(),
  defaultCurrency: text('default_currency').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  version: integer('version').notNull().default(1),
})

export const userMarketMemberships = pgTable('user_market_memberships', {
  id: identity(),
  marketId: integer('market_id').notNull(),
  userId: integer('user_id').notNull(),
  active: boolean('active').notNull().default(true),
  grantedBy: integer('granted_by').notNull(),
  grantedAt: timestamp('granted_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  revokedBy: integer('revoked_by'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  version: integer('version').notNull().default(1),
})

export const invitations = pgTable('invitations', {
  id: identity(),
  userId: integer('user_id').notNull(),
  invitedBy: integer('invited_by').notNull(),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const auditEvents = pgTable('audit_events', {
  id: identity(),
  marketId: integer('market_id'),
  actorId: integer('actor_id'),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: integer('resource_id'),
  resourceVersion: integer('resource_version'),
  requestId: uuid('request_id').notNull(),
  reason: text('reason'),
  safeDiff: jsonb('safe_diff').notNull().default({}),
  result: text('result').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const customers = pgTable(
  'customers',
  {
    id: identity(),
    marketId: integer('market_id').notNull(),
    code: text('code').notNull(),
    legalName: text('legal_name').notNull(),
    tradeName: text('trade_name'),
    countryCode: text('country_code').notNull(),
    preferredLanguage: text('preferred_language'),
    preferredCurrency: text('preferred_currency'),
    website: text('website'),
    status: text('status').notNull(),
    ownerId: integer('owner_id').notNull(),
    teamId: integer('team_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (table) => [
    index('customers_owner_page').on(
      table.marketId,
      table.ownerId,
      table.createdAt,
      table.id,
    ),
    index('idx_customers_team_id').on(table.teamId),
  ],
)

export const customerAddresses = pgTable(
  'customer_addresses',
  {
    id: identity(),
    marketId: integer('market_id').notNull(),
    customerId: integer('customer_id').notNull(),
    kind: text('kind').notNull(),
    addressLines: text('address_lines').notNull(),
    city: text('city'),
    region: text('region'),
    postalCode: text('postal_code'),
    countryCode: text('country_code').notNull(),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (table) => [
    index('idx_customer_addresses_market_id_customer_id').on(
      table.marketId,
      table.customerId,
    ),
  ],
)

export const customerIdentifiers = pgTable(
  'customer_identifiers',
  {
    id: identity(),
    marketId: integer('market_id').notNull(),
    customerId: integer('customer_id').notNull(),
    kind: text('kind').notNull(),
    value: text('value').notNull(),
    normalizedValue: text('normalized_value').notNull(),
    issuingCountry: text('issuing_country'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (table) => [
    index('customer_identifier_duplicate').on(
      table.marketId,
      table.kind,
      table.normalizedValue,
    ),
    index('idx_customer_identifiers_market_id_customer_id').on(
      table.marketId,
      table.customerId,
    ),
  ],
)

export const recordLinks = pgTable('record_links', {
  id: identity(),
  marketId: integer('market_id').notNull(),
  customerId: integer('customer_id'),
  contactId: integer('contact_id'),
  leadId: integer('lead_id'),
  opportunityId: integer('opportunity_id'),
  rfqId: integer('rfq_id'),
  quotationId: integer('quotation_id'),
  salesOrderId: integer('sales_order_id'),
  sampleId: integer('sample_id'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const customerTransfers = pgTable('customer_transfers', {
  id: identity(),
  marketId: integer('market_id').notNull(),
  customerId: integer('customer_id').notNull(),
  transferredAt: timestamp('transferred_at', { withTimezone: true }).notNull(),
  reason: text('reason').notNull(),
  formerOwnerId: integer('former_owner_id').notNull(),
  newOwnerId: integer('new_owner_id').notNull(),
  authorizedBy: integer('authorized_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const historySnapshots = pgTable('history_snapshots', {
  id: identity(),
  marketId: integer('market_id').notNull(),
  transferId: integer('transfer_id').notNull(),
  recordLinkId: integer('record_link_id').notNull(),
  sourceVersion: integer('source_version').notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const historyEntitlements = pgTable('history_entitlements', {
  id: identity(),
  marketId: integer('market_id').notNull(),
  snapshotId: integer('snapshot_id').notNull(),
  userId: integer('user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const duplicateReviews = pgTable('duplicate_reviews', {
  id: identity(),
  marketId: integer('market_id').notNull(),
  leadId: integer('lead_id'),
  customerId: integer('customer_id'),
  candidateCustomerId: integer('candidate_customer_id').notNull(),
  state: text('state').notNull(),
  resolution: text('resolution'),
  reason: text('reason'),
  requestedBy: integer('requested_by').notNull(),
  reviewedBy: integer('reviewed_by'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  version: integer('version').notNull().default(1),
})

export const authRateLimits = pgTable(
  'auth_rate_limits',
  {
    keyHash: text('key_hash').notNull(),
    failureCount: integer('failure_count').notNull().default(0),
    windowStartedAt: timestamp('window_started_at', {
      withTimezone: true,
    }).notNull(),
    blockedUntil: timestamp('blocked_until', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.keyHash] })],
)
