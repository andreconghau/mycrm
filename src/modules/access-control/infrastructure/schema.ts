import { desc, sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
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

export const contacts = pgTable(
  'contacts',
  {
    id: identity(),
    marketId: integer('market_id').notNull(),
    customerId: integer('customer_id').notNull(),
    displayName: text('display_name').notNull(),
    jobTitle: text('job_title'),
    department: text('department'),
    preferredLanguage: text('preferred_language'),
    timezone: text('timezone'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (table) => [
    index('contacts_parent_page').on(
      table.marketId,
      table.customerId,
      table.createdAt,
      table.id,
    ),
    index('idx_contacts_market_id').on(table.marketId, table.id),
  ],
)

export const contactChannels = pgTable(
  'contact_channels',
  {
    id: identity(),
    marketId: integer('market_id').notNull(),
    contactId: integer('contact_id').notNull(),
    kind: text('kind').notNull(),
    handle: text('handle').notNull(),
    normalizedHandle: text('normalized_handle').notNull(),
    isPrimary: boolean('is_primary').notNull().default(false),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (table) => [
    uniqueIndex('contact_channel_primary')
      .on(table.marketId, table.contactId, table.kind)
      .where(sql`is_primary`),
    index('contact_channel_duplicate').on(
      table.marketId,
      table.kind,
      table.normalizedHandle,
    ),
    index('idx_contact_channels_market_id_contact_id').on(
      table.marketId,
      table.contactId,
    ),
  ],
)

export const contactPreferences = pgTable(
  'contact_preferences',
  {
    id: identity(),
    marketId: integer('market_id').notNull(),
    contactId: integer('contact_id').notNull(),
    purpose: text('purpose').notNull(),
    allowed: boolean('allowed').notNull().default(false),
    evidenceFileId: integer('evidence_file_id'),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (table) => [
    uniqueIndex('contact_preferences_market_id_contact_id_purpose_key').on(
      table.marketId,
      table.contactId,
      table.purpose,
    ),
    index('idx_contact_preferences_market_id_contact_id').on(
      table.marketId,
      table.contactId,
    ),
  ],
)

export const customerPrimaryContacts = pgTable(
  'customer_primary_contacts',
  {
    id: identity(),
    marketId: integer('market_id').notNull(),
    customerId: integer('customer_id').notNull(),
    contactId: integer('contact_id').notNull(),
    context: text('context').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (table) => [
    uniqueIndex('customer_primary_contacts_market_id_customer_id_context_key').on(
      table.marketId,
      table.customerId,
      table.context,
    ),
    index(
      'idx_customer_primary_contacts_market_id_customer_id_contact_id',
    ).on(table.marketId, table.customerId, table.contactId),
  ],
)

/**
 * Mapping only — the physical table is created by the R1 baseline initializer.
 * No storage adapter exists yet, so these columns are read-only for M07's
 * authorized document metadata listing; nothing in R1-06 writes to `files`.
 */
export const files = pgTable('files', {
  id: identity(),
  marketId: integer('market_id').notNull(),
  uploadedBy: integer('uploaded_by').notNull(),
  storageKey: text('storage_key').notNull(),
  originalName: text('original_name').notNull(),
  mediaType: text('media_type').notNull(),
  byteSize: bigint('byte_size', { mode: 'number' }).notNull(),
  sha256: text('sha256').notNull(),
  scanState: text('scan_state').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const fileAttachments = pgTable(
  'file_attachments',
  {
    id: identity(),
    marketId: integer('market_id').notNull(),
    fileId: integer('file_id').notNull(),
    recordLinkId: integer('record_link_id'),
    specificationVersionId: integer('specification_version_id'),
    quotationVersionId: integer('quotation_version_id'),
    purpose: text('purpose').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_file_attachments_market_id_specification_version_id').on(
      table.marketId,
      table.specificationVersionId,
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

export const products = pgTable(
  'products',
  {
    id: identity(),
    sku: text('sku').notNull(),
    displayName: text('display_name').notNull(),
    category: text('category'),
    speciesCommonName: text('species_common_name'),
    speciesScientificName: text('species_scientific_name'),
    productFamily: text('product_family'),
    defaultUnit: text('default_unit').notNull(),
    status: text('status').notNull(),
    descriptionEn: text('description_en'),
    descriptionVi: text('description_vi'),
    descriptionKo: text('description_ko'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (table) => [
    uniqueIndex('products_sku_key').on(table.sku),
    index('products_status_idx').on(table.status),
    index('products_category_idx').on(table.category),
  ],
)

export const productAliases = pgTable(
  'product_aliases',
  {
    id: identity(),
    productId: integer('product_id').notNull(),
    locale: text('locale').notNull(),
    label: text('label').notNull(),
    kind: text('kind').notNull().default('ALIAS'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('product_aliases_product_id_locale_label_key').on(
      table.productId,
      table.locale,
      table.label,
    ),
  ],
)

export const marketProducts = pgTable(
  'market_products',
  {
    id: identity(),
    marketId: integer('market_id').notNull(),
    productId: integer('product_id').notNull(),
    eligible: boolean('eligible').notNull().default(true),
    availability: text('availability'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (table) => [
    uniqueIndex('market_products_market_id_product_id_key').on(table.marketId, table.productId),
  ],
)

/**
 * M07 Product Specifications. The physical tables come from the R1 baseline
 * initializer; `customer_id` and the revision content columns are added by
 * migration 0004_product_specifications.
 */
export const specifications = pgTable(
  'specifications',
  {
    id: identity(),
    marketId: integer('market_id').notNull(),
    productId: integer('product_id').notNull(),
    /** NULL = standard specification; set = buyer-specific specification. */
    customerId: integer('customer_id'),
    code: text('code').notNull(),
    /** false = archived specification; historical references are preserved. */
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (table) => [
    index('idx_specifications_market_id_product_id').on(
      table.marketId,
      table.productId,
    ),
    index('specifications_market_customer_idx').on(
      table.marketId,
      table.customerId,
    ),
    index('specifications_market_active_idx').on(table.marketId, table.active),
  ],
)

export const specificationVersions = pgTable(
  'specification_versions',
  {
    id: identity(),
    marketId: integer('market_id').notNull(),
    specificationId: integer('specification_id').notNull(),
    productId: integer('product_id').notNull(),
    /** Content revision number within one specification. */
    revisionNo: integer('revision_no').notNull(),
    /** DRAFT -> APPROVED -> ARCHIVED. */
    status: text('status').notNull(),

    nameEn: text('name_en'),
    nameVi: text('name_vi'),
    nameKo: text('name_ko'),
    descriptionEn: text('description_en'),
    descriptionVi: text('description_vi'),
    descriptionKo: text('description_ko'),

    grade: text('grade'),
    processing: text('processing'),
    treatment: text('treatment'),
    frozenForm: text('frozen_form'),
    sizeBand: text('size_band'),
    sizeUnit: text('size_unit'),

    netWeightPerPack: numeric('net_weight_per_pack'),
    grossWeightPerPack: numeric('gross_weight_per_pack'),
    weightUnit: text('weight_unit'),
    packsPerCarton: integer('packs_per_carton'),
    cartonNetWeight: numeric('carton_net_weight'),
    glazingPercent: numeric('glazing_percent'),
    packaging: text('packaging'),
    packagingMaterial: text('packaging_material'),
    uom: text('uom'),
    moq: numeric('moq'),
    moqUnit: text('moq_unit'),

    storageTempC: numeric('storage_temp_c'),
    shelfLifeMonths: integer('shelf_life_months'),
    originCountry: text('origin_country'),
    certifications: text('certifications').array(),
    labelLanguages: text('label_languages').array(),

    buyerRequirements: text('buyer_requirements'),
    notes: text('notes'),
    requirements: jsonb('requirements').notNull().default({}),

    createdBy: integer('created_by').notNull(),
    approvedBy: integer('approved_by'),
    /** Approval instant; the lifecycle has no separate PUBLISHED state. */
    publishedAt: timestamp('published_at', { withTimezone: true }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (table) => [
    index('specification_versions_market_product_status_idx').on(
      table.marketId,
      table.productId,
      table.status,
    ),
    // Postgres truncates the baseline name at 63 characters.
    index('idx_specification_versions_market_id_product_id_specification_i').on(
      table.marketId,
      table.productId,
      table.specificationId,
    ),
  ],
)

export const priceLists = pgTable(
  'price_lists',
  {
    id: identity(),
    marketId: integer('market_id').notNull(),
    code: text('code').notNull(),
    customerId: integer('customer_id'),
    tier: text('tier').notNull(),
    currency: text('currency').notNull(),
    validFrom: timestamp('valid_from', { withTimezone: true }).notNull(),
    validTo: timestamp('valid_to', { withTimezone: true }),
    status: text('status').notNull(),
    approvedBy: integer('approved_by'),
    createdBy: integer('created_by').notNull(),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    archiveReason: text('archive_reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (table) => [
    index('price_lists_eligibility_idx').on(
      table.marketId,
      table.status,
      table.tier,
      table.validFrom,
      table.validTo,
    ),
  ],
)

export const priceListItems = pgTable(
  'price_list_items',
  {
    id: identity(),
    marketId: integer('market_id').notNull(),
    priceListId: integer('price_list_id').notNull(),
    productId: integer('product_id').notNull(),
    specificationVersionId: integer('specification_version_id'),
    unit: text('unit').notNull(),
    priceBasis: text('price_basis').notNull(),
    priceBasisNote: text('price_basis_note'),
    unitPrice: numeric('unit_price').notNull(),
    minQuantity: numeric('min_quantity'),
    maxQuantity: numeric('max_quantity'),
    validFrom: timestamp('valid_from', { withTimezone: true }).notNull(),
    validTo: timestamp('valid_to', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (table) => [
    index('price_list_items_lookup_idx').on(
      table.marketId,
      table.productId,
      table.unit,
      table.validFrom,
      table.validTo,
    ),
  ],
)

export const priceSelections = pgTable(
  'price_selections',
  {
    id: identity(),
    marketId: integer('market_id').notNull(),
    contextType: text('context_type').notNull(),
    contextId: integer('context_id'),
    productId: integer('product_id').notNull(),
    specificationVersionId: integer('specification_version_id'),
    priceListId: integer('price_list_id'),
    priceListItemId: integer('price_list_item_id'),
    selectionType: text('selection_type').notNull(),
    listedAmount: numeric('listed_amount'),
    selectedAmount: numeric('selected_amount').notNull(),
    currency: text('currency').notNull(),
    unit: text('unit').notNull(),
    priceBasis: text('price_basis').notNull(),
    quantity: numeric('quantity').notNull(),
    reason: text('reason'),
    sourceMetadata: jsonb('source_metadata').notNull().default({}),
    selectedBy: integer('selected_by').notNull(),
    selectedAt: timestamp('selected_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    requestId: uuid('request_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('price_selections_context_idx').on(
      table.marketId,
      table.contextType,
      table.contextId,
    ),
    index('price_selections_product_time_idx').on(
      table.marketId,
      table.productId,
      table.selectedAt,
    ),
    index('price_selections_item_idx').on(
      table.marketId,
      table.priceListItemId,
    ),
  ],
)

export const rfqs = pgTable(
  'rfqs',
  {
    id: identity(),
    marketId: integer('market_id').notNull(),
    number: text('number').notNull(),
    customerId: integer('customer_id').notNull(),
    contactId: integer('contact_id'),
    opportunityId: integer('opportunity_id'),
    source: text('source').notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull(),
    responseDueAt: timestamp('response_due_at', { withTimezone: true }),
    destinationCountry: text('destination_country'),
    status: text('status').notNull(),
    ownerId: integer('owner_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (table) => [
    index('rfqs_owner_page').on(table.marketId, table.ownerId, desc(table.createdAt), desc(table.id)),
    index('idx_rfqs_market_id_customer_id_contact_id').on(table.marketId, table.customerId, table.contactId),
  ],
)

export const rfqLines = pgTable(
  'rfq_lines',
  {
    id: identity(),
    marketId: integer('market_id').notNull(),
    rfqId: integer('rfq_id').notNull(),
    lineNo: integer('line_no').notNull(),
    productId: integer('product_id'),
    freeTextRequest: text('free_text_request'),
    requirements: jsonb('requirements').notNull().default({}),
    quantity: numeric('quantity'),
    unit: text('unit'),
    targetPrice: numeric('target_price'),
    currency: text('currency'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (table) => [
    index('idx_rfq_lines_market_id_rfq_id').on(table.marketId, table.rfqId),
  ],
)

export const quotations = pgTable(
  'quotations',
  {
    id: identity(),
    marketId: integer('market_id').notNull(),
    rfqId: integer('rfq_id').notNull(),
    number: text('number').notNull(),
    ownerId: integer('owner_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (table) => [
    index('quotations_owner_page').on(table.marketId, table.ownerId, desc(table.createdAt), desc(table.id)),
    index('idx_quotations_market_id_rfq_id').on(table.marketId, table.rfqId),
  ],
)

export const quotationVersions = pgTable(
  'quotation_versions',
  {
    id: identity(),
    marketId: integer('market_id').notNull(),
    quotationId: integer('quotation_id').notNull(),
    rfqId: integer('rfq_id').notNull(),
    revisionNo: integer('revision_no').notNull(),
    state: text('state').notNull(),
    currency: text('currency').notNull().default('USD'),
    vndPerUsd: numeric('vnd_per_usd', { precision: 18, scale: 4 }),
    fxSource: text('fx_source'),
    fxAt: timestamp('fx_at', { withTimezone: true }),
    incoterm: text('incoterm'),
    incotermPlace: text('incoterm_place'),
    incotermYear: integer('incoterm_year'),
    paymentTerms: text('payment_terms'),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    originalUsdTotal: numeric('original_usd_total'),
    originalVndTotal: numeric('original_vnd_total'),
    unroundedUsdTotal: numeric('unrounded_usd_total'),
    unroundedUsdNumerator: text('unrounded_usd_numerator'),
    unroundedUsdDenominator: text('unrounded_usd_denominator'),
    roundedUsdTotal: numeric('rounded_usd_total'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    issuedAt: timestamp('issued_at', { withTimezone: true }),
    pdfFileId: integer('pdf_file_id'),
    createdBy: integer('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (table) => [
    index('quotation_versions_draft_idx').on(table.marketId, table.quotationId, desc(table.revisionNo), table.id),
  ],
)

export const quotationLines = pgTable(
  'quotation_lines',
  {
    id: identity(),
    marketId: integer('market_id').notNull(),
    quotationVersionId: integer('quotation_version_id').notNull(),
    rfqId: integer('rfq_id').notNull(),
    rfqLineId: integer('rfq_line_id'),
    lineNo: integer('line_no').notNull(),
    productId: integer('product_id'),
    specificationVersionId: integer('specification_version_id'),
    quantity: numeric('quantity'),
    unit: text('unit'),
    inputCurrency: text('input_currency'),
    inputUnitPrice: numeric('input_unit_price'),
    originalLineAmount: numeric('original_line_amount'),
    convertedUsdAmount: numeric('converted_usd_amount'),
    priceListItemId: integer('price_list_item_id'),
    priceSelectionId: integer('price_selection_id'),
    referencePrice: numeric('reference_price'),
    referenceCurrency: text('reference_currency'),
    priceReason: text('price_reason'),
    priceBasis: text('price_basis'),
    priceBasisNote: text('price_basis_note'),
    productSnapshot: jsonb('product_snapshot'),
    specificationSnapshot: jsonb('specification_snapshot'),
    selectedBy: integer('selected_by'),
    selectedAt: timestamp('selected_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('quotation_lines_market_id_quotation_version_id_line_no_key').on(table.marketId, table.quotationVersionId, table.lineNo),
  ],
)

export const quotationAdjustments = pgTable(
  'quotation_adjustments',
  {
    id: identity(),
    marketId: integer('market_id').notNull(),
    quotationVersionId: integer('quotation_version_id').notNull(),
    kind: text('kind').notNull(),
    inputCurrency: text('input_currency').notNull(),
    originalAmount: numeric('original_amount').notNull(),
    convertedUsdAmount: numeric('converted_usd_amount').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_quotation_adjustments_market_id_quotation_version_id').on(table.marketId, table.quotationVersionId),
  ],
)

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
