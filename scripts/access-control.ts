import { randomBytes, randomUUID, createHash } from 'node:crypto'
import postgres from 'postgres'
import { loadEnvConfig } from '@next/env'
import { hashPassword } from '../src/modules/access-control/infrastructure/password'
import { customerAdminGrants } from '../src/modules/access-control/domain/customer-admin-grants'
import {
  contactAdminGrants,
  contactGrants,
} from '../src/modules/access-control/domain/contact-grants'
import {
  productAdminGrants,
  productSaleGrants,
} from '../src/modules/products/domain/product-grants'
import {
  specificationAdminGrants,
  specificationSaleGrants,
} from '../src/modules/product-specifications/domain/specification-grants'
import {
  priceListAdminGrants,
  priceListSaleGrants,
} from '../src/modules/price-lists/domain/price-list-grants'

loadEnvConfig(process.cwd())

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required')
const sql = postgres(databaseUrl, { max: 1, prepare: false })

function option(name: string) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

async function readPassword() {
  if (process.argv.includes('--password-stdin')) {
    let value = ''
    for await (const chunk of process.stdin) value += chunk
    return value.replace(/[\r\n]+$/, '')
  }
  if (!process.stdin.isTTY)
    throw new Error('Pass --password-stdin when stdin is not a TTY')
  const terminal = process.stdin
  terminal.setRawMode?.(true)
  terminal.resume()
  process.stdout.write('Password: ')
  let value = ''
  return new Promise<string>((resolve, reject) => {
    const onData = (chunk: Buffer) => {
      const character = chunk.toString('utf8')
      if (character === '\u0003') {
        cleanup()
        reject(new Error('Cancelled'))
      } else if (character === '\r' || character === '\n') {
        cleanup()
        process.stdout.write('\n')
        resolve(value)
      } else if (character === '\u007f') {
        value = value.slice(0, -1)
      } else {
        value += character
      }
    }
    const cleanup = () => {
      terminal.off('data', onData)
      terminal.setRawMode?.(false)
      terminal.pause()
    }
    terminal.on('data', onData)
  })
}

const grants = [
  ['access.users', 'read'],
  ['access.users', 'list'],
  ['access.users', 'invite'],
  ['access.users', 'disable'],
  ['access.roles', 'read'],
  ['access.roles', 'manage'],
  ['access.grants', 'read'],
  ['access.grants', 'manage'],
  ['access.teams', 'read'],
  ['access.teams', 'manage'],
  ['access.markets', 'read'],
  ['access.markets', 'manage'],
] as const

const customerReadFields = [
  'id',
  'code',
  'legalName',
  'tradeName',
  'countryCode',
  'preferredLanguage',
  'preferredCurrency',
  'website',
  'status',
  'ownerId',
  'teamId',
  'version',
  'addresses',
  'identifiers',
]

const customerGrantPolicy = [
  {
    role: 'sale',
    action: 'create',
    scope: 'OWN',
    read: customerReadFields,
    write: [
      'code',
      'legalName',
      'tradeName',
      'countryCode',
      'preferredLanguage',
      'preferredCurrency',
      'website',
      'status',
      'teamId',
      'addresses',
      'identifiers',
    ],
  },
  {
    role: 'sale',
    action: 'read',
    scope: 'OWN',
    read: customerReadFields,
    write: [],
  },
  {
    role: 'sale',
    action: 'update',
    scope: 'OWN',
    read: customerReadFields,
    write: [
      'legalName',
      'tradeName',
      'countryCode',
      'preferredLanguage',
      'preferredCurrency',
      'website',
      'status',
      'addresses',
      'identifiers',
    ],
  },
  {
    role: 'sale',
    action: 'archive',
    scope: 'OWN',
    read: customerReadFields,
    write: [],
  },
  {
    role: 'manager',
    action: 'read',
    scope: 'TEAM',
    read: customerReadFields,
    write: [],
  },
  {
    role: 'manager',
    action: 'update',
    scope: 'TEAM',
    read: customerReadFields,
    write: [
      'legalName',
      'tradeName',
      'countryCode',
      'preferredLanguage',
      'preferredCurrency',
      'website',
      'status',
      'addresses',
      'identifiers',
    ],
  },
  {
    role: 'manager',
    action: 'reassign',
    scope: 'TEAM',
    read: customerReadFields,
    write: ['ownerId', 'teamId'],
  },
  ...customerAdminGrants.map((grant) => ({
    role: 'admin',
    action: grant.action,
    scope: grant.recordScope,
    read: grant.readFields,
    write: grant.writeFields,
  })),
]

async function bootstrapAdmin() {
  const email = option('--email')?.trim().toLowerCase()
  const displayName = option('--display-name')?.trim()
  if (!email || !displayName)
    throw new Error('--email and --display-name are required')
  const passwordHash = await hashPassword(await readPassword())
  const userId = await sql.begin(async (transaction) => {
    const [user] = await transaction<{ id: number }[]>`
      INSERT INTO users (email, display_name, password_hash, status)
      VALUES (${email}, ${displayName}, ${passwordHash}, 'ACTIVE')
      RETURNING id
    `
    await transaction`
      INSERT INTO user_roles (user_id, role_code, active, granted_by)
      VALUES (${user.id}, 'admin', true, ${user.id})
    `
    for (const [resource, action] of grants) {
      await transaction`
        INSERT INTO role_grants (
          role_code, resource, action, record_scope, read_fields,
          write_fields, active, changed_by
        ) VALUES (
          'admin', ${resource}, ${action}, 'ALL',
          ${['id', 'email', 'displayName', 'status', 'version']},
          ${['displayName', 'status', 'roleCode', 'active']}, true, ${user.id}
        ) ON CONFLICT (role_code, resource, action, record_scope) DO NOTHING
      `
    }
    for (const grant of contactAdminGrants) {
      await transaction`
        INSERT INTO role_grants (
          role_code, resource, action, record_scope, read_fields,
          write_fields, active, changed_by
        ) VALUES (
          ${grant.roleCode}, ${grant.resource}, ${grant.action},
          ${grant.recordScope},
          ${[...grant.readFields]}, ${[...grant.writeFields]}, true, ${user.id}
        ) ON CONFLICT (role_code, resource, action, record_scope)
        DO UPDATE SET
          read_fields = EXCLUDED.read_fields,
          write_fields = EXCLUDED.write_fields,
          active = true,
          changed_by = EXCLUDED.changed_by,
          updated_at = now(),
          version = role_grants.version + 1
      `
    }
    for (const grant of customerAdminGrants) {
      await transaction`
        INSERT INTO role_grants (
          role_code, resource, action, record_scope, read_fields,
          write_fields, active, changed_by
        ) VALUES (
          'admin', ${grant.resource}, ${grant.action}, ${grant.recordScope},
          ${grant.readFields}, ${grant.writeFields}, true, ${user.id}
        ) ON CONFLICT (role_code, resource, action, record_scope)
        DO UPDATE SET
          read_fields = EXCLUDED.read_fields,
          write_fields = EXCLUDED.write_fields,
          active = true,
          changed_by = EXCLUDED.changed_by,
          updated_at = now(),
          version = role_grants.version + 1
      `
    }
    await transaction`
      INSERT INTO audit_events (
        actor_id, action, resource_type, resource_id, request_id, safe_diff, result
      ) VALUES (
        ${user.id}, 'access.bootstrap_admin', 'user', ${user.id}, ${randomUUID()},
        ${transaction.json({ roles: ['admin'], grantBoundary: 'M29_M01_M02' })}, 'SUCCESS'
      )
    `
    return user.id
  })
  process.stdout.write(`Bootstrapped access administrator user ${userId}.\n`)
}

async function invite() {
  const actorEmail = option('--actor-email')?.trim().toLowerCase()
  const email = option('--email')?.trim().toLowerCase()
  const displayName = option('--display-name')?.trim()
  if (!actorEmail || !email || !displayName) {
    throw new Error('--actor-email, --email and --display-name are required')
  }
  const [actor] = await sql<{ id: number }[]>`
    SELECT users.id
    FROM users
    JOIN user_roles ON user_roles.user_id = users.id
    JOIN role_grants ON role_grants.role_code = user_roles.role_code
    WHERE users.email = ${actorEmail}
      AND users.status = 'ACTIVE'
      AND user_roles.active
      AND role_grants.active
      AND role_grants.resource = 'access.users'
      AND role_grants.action = 'invite'
    LIMIT 1
  `
  if (!actor) throw new Error('The actor is not authorized to invite employees')
  const token = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(token).digest('base64url')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await sql.begin(async (transaction) => {
    const [user] = await transaction<{ id: number }[]>`
      INSERT INTO users (email, display_name, status)
      VALUES (${email}, ${displayName}, 'INVITED')
      RETURNING id
    `
    const [invitation] = await transaction<{ id: number }[]>`
      INSERT INTO invitations (user_id, invited_by, token_hash, expires_at)
      VALUES (${user.id}, ${actor.id}, ${tokenHash}, ${expiresAt})
      RETURNING id
    `
    await transaction`
      INSERT INTO audit_events (
        actor_id, action, resource_type, resource_id, request_id, safe_diff, result
      ) VALUES (
        ${actor.id}, 'access.user_invited', 'user', ${user.id}, ${randomUUID()},
        ${transaction.json({ invitationId: invitation.id })}, 'SUCCESS'
      )
    `
  })
  const origin = process.env.APP_ORIGIN ?? 'http://127.0.0.1:3000'
  process.stdout.write(
    `${origin}/vi/accept-invitation?token=${encodeURIComponent(token)}\n`,
  )
  process.stderr.write(
    'The invitation link was emitted once. Deliver it through an approved private channel.\n',
  )
}

async function grantCustomers() {
  const actorEmail = option('--actor-email')?.trim().toLowerCase()
  if (!actorEmail) throw new Error('--actor-email is required')
  const result = await sql.begin(async (transaction) => {
    const [actor] = await transaction<{ id: number }[]>`
      SELECT users.id
      FROM users
      JOIN user_roles ON user_roles.user_id = users.id
      JOIN role_grants ON role_grants.role_code = user_roles.role_code
      WHERE users.email = ${actorEmail}
        AND users.status = 'ACTIVE'
        AND user_roles.active
        AND user_roles.role_code = 'admin'
        AND role_grants.active
        AND role_grants.resource = 'access.grants'
        AND role_grants.action = 'manage'
      LIMIT 1
      FOR UPDATE OF users
    `
    if (!actor) throw new Error('The actor cannot manage role grants')
    let changed = 0
    for (const grant of customerGrantPolicy) {
      const rows = await transaction<{ id: number }[]>`
        INSERT INTO role_grants (
          role_code, resource, action, record_scope, read_fields,
          write_fields, active, changed_by
        ) VALUES (
          ${grant.role}, 'customers', ${grant.action}, ${grant.scope},
          ${grant.read}, ${grant.write}, true, ${actor.id}
        )
        ON CONFLICT (role_code, resource, action, record_scope)
        DO UPDATE SET
          read_fields = EXCLUDED.read_fields,
          write_fields = EXCLUDED.write_fields,
          active = true,
          changed_by = EXCLUDED.changed_by,
          updated_at = now(),
          version = role_grants.version + 1
        WHERE role_grants.read_fields IS DISTINCT FROM EXCLUDED.read_fields
          OR role_grants.write_fields IS DISTINCT FROM EXCLUDED.write_fields
          OR role_grants.active IS DISTINCT FROM true
        RETURNING id
      `
      changed += rows.length
    }
    if (changed) {
      await transaction`
        INSERT INTO audit_events (
          actor_id, action, resource_type, request_id, safe_diff, result
        ) VALUES (
          ${actor.id}, 'access.customer_grants_activated', 'role_grant',
          ${randomUUID()},
          ${transaction.json({ grantBoundary: 'M01_CUSTOMERS_APPROVED' })},
          'SUCCESS'
        )
      `
    }
    return changed
  })
  process.stdout.write(
    result
      ? `Activated ${result} approved Customers role grants.\n`
      : 'Approved Customers role grants are already active.\n',
  )
}

async function grantContacts() {
  const actorEmail = option('--actor-email')?.trim().toLowerCase()
  if (!actorEmail) throw new Error('--actor-email is required')
  const result = await sql.begin(async (transaction) => {
    const [actor] = await transaction<{ id: number }[]>`
      SELECT users.id
      FROM users
      JOIN user_roles ON user_roles.user_id = users.id
      JOIN role_grants ON role_grants.role_code = user_roles.role_code
      WHERE users.email = ${actorEmail}
        AND users.status = 'ACTIVE'
        AND user_roles.active
        AND user_roles.role_code = 'admin'
        AND role_grants.active
        AND role_grants.resource = 'access.grants'
        AND role_grants.action = 'manage'
      LIMIT 1
      FOR UPDATE OF users
    `
    if (!actor) throw new Error('The actor cannot manage role grants')
    let changed = 0
    for (const grant of contactGrants) {
      const rows = await transaction<{ id: number }[]>`
        INSERT INTO role_grants (
          role_code, resource, action, record_scope, read_fields,
          write_fields, active, changed_by
        ) VALUES (
          ${grant.roleCode}, 'contacts', ${grant.action}, ${grant.recordScope},
          ${[...grant.readFields]}, ${[...grant.writeFields]}, true, ${actor.id}
        )
        ON CONFLICT (role_code, resource, action, record_scope)
        DO UPDATE SET
          read_fields = EXCLUDED.read_fields,
          write_fields = EXCLUDED.write_fields,
          active = true,
          changed_by = EXCLUDED.changed_by,
          updated_at = now(),
          version = role_grants.version + 1
        WHERE role_grants.read_fields IS DISTINCT FROM EXCLUDED.read_fields
          OR role_grants.write_fields IS DISTINCT FROM EXCLUDED.write_fields
          OR role_grants.active IS DISTINCT FROM true
        RETURNING id
      `
      changed += rows.length
    }
    if (changed) {
      await transaction`
        INSERT INTO audit_events (
          actor_id, action, resource_type, request_id, safe_diff, result
        ) VALUES (
          ${actor.id}, 'access.contact_grants_activated', 'role_grant',
          ${randomUUID()},
          ${transaction.json({ grantBoundary: 'M02_CONTACTS_APPROVED' })},
          'SUCCESS'
        )
      `
    }
    return changed
  })
  process.stdout.write(
    result
      ? `Activated ${result} approved Contacts role grants.\n`
      : 'Approved Contacts role grants are already active.\n',
  )
}

async function grantProducts() {
  const actorEmail = option('--actor-email')?.trim().toLowerCase()
  if (!actorEmail) throw new Error('--actor-email is required')
  const result = await sql.begin(async (transaction) => {
    const [actor] = await transaction<{ id: number }[]>`
      SELECT users.id
      FROM users
      JOIN user_roles ON user_roles.user_id = users.id
      JOIN role_grants ON role_grants.role_code = user_roles.role_code
      WHERE users.email = ${actorEmail}
        AND users.status = 'ACTIVE'
        AND user_roles.active
        AND user_roles.role_code = 'admin'
        AND role_grants.active
        AND role_grants.resource = 'access.grants'
        AND role_grants.action = 'manage'
      LIMIT 1
      FOR UPDATE OF users
    `
    if (!actor) throw new Error('The actor cannot manage role grants')
    let changed = 0
    const assignments: Array<{ roleCode: 'admin' | 'manager' | 'sale'; grants: typeof productAdminGrants | typeof productSaleGrants }> = [
      { roleCode: 'admin', grants: productAdminGrants },
      { roleCode: 'manager', grants: productAdminGrants },
      { roleCode: 'sale', grants: productSaleGrants },
    ]
    for (const assignment of assignments) {
      for (const grant of assignment.grants) {
        const rows = await transaction<{ id: number }[]>`
          INSERT INTO role_grants (
            role_code, resource, action, record_scope, read_fields,
            write_fields, active, changed_by
          ) VALUES (
            ${assignment.roleCode}, ${grant.resource}, ${grant.action}, ${grant.recordScope},
            ${[...grant.readFields]}, ${[...grant.writeFields]}, true, ${actor.id}
          )
          ON CONFLICT (role_code, resource, action, record_scope)
          DO UPDATE SET
            read_fields = EXCLUDED.read_fields,
            write_fields = EXCLUDED.write_fields,
            active = true,
            changed_by = EXCLUDED.changed_by,
            updated_at = now(),
            version = role_grants.version + 1
          WHERE role_grants.read_fields IS DISTINCT FROM EXCLUDED.read_fields
            OR role_grants.write_fields IS DISTINCT FROM EXCLUDED.write_fields
            OR role_grants.active IS DISTINCT FROM true
          RETURNING id
        `
        changed += rows.length
      }
    }
    if (changed) {
      await transaction`
        INSERT INTO audit_events (
          actor_id, action, resource_type, request_id, safe_diff, result
        ) VALUES (
          ${actor.id}, 'access.product_grants_activated', 'role_grant',
          ${randomUUID()},
          ${transaction.json({ grantBoundary: 'M06_PRODUCTS_APPROVED' })},
          'SUCCESS'
        )
      `
    }
    return changed
  })
  process.stdout.write(
    result
      ? `Activated ${result} approved Products role grants.\n`
      : 'Approved Products role grants are already active.\n',
  )
}

async function seedInitialMarkets() {
  const actorEmail = option('--actor-email')?.trim().toLowerCase()
  if (!actorEmail) throw new Error('--actor-email is required')
  const initialMarkets = [
    { code: 'KR', nameEn: 'South Korea', nameVi: 'Hàn Quốc', currency: 'KRW' },
    { code: 'JP', nameEn: 'Japan', nameVi: 'Nhật Bản', currency: 'JPY' },
    { code: 'US', nameEn: 'United States', nameVi: 'Mỹ', currency: 'USD' },
  ] as const
  const result = await sql.begin(async (transaction) => {
    const [actor] = await transaction<{ id: number }[]>`
      SELECT users.id
      FROM users
      JOIN user_roles ON user_roles.user_id = users.id
      JOIN role_grants ON role_grants.role_code = user_roles.role_code
      WHERE users.email = ${actorEmail}
        AND users.status = 'ACTIVE'
        AND user_roles.active
        AND user_roles.role_code = 'admin'
        AND role_grants.active
        AND role_grants.resource = 'access.markets'
        AND role_grants.action = 'manage'
      LIMIT 1
      FOR UPDATE OF users
    `
    if (!actor) throw new Error('The actor cannot manage markets')
    const rows: Array<{ id: number; code: string; created: boolean }> = []
    for (const market of initialMarkets) {
      const [existing] = await transaction<{
        id: number
        nameEn: string
        nameVi: string
        currency: string
        active: boolean
      }[]>`
        SELECT id, name_en AS "nameEn", name_vi AS "nameVi",
          default_currency AS currency, active
        FROM markets WHERE code = ${market.code} FOR UPDATE
      `
      if (existing) {
        if (
          existing.nameEn !== market.nameEn ||
          existing.nameVi !== market.nameVi ||
          existing.currency !== market.currency ||
          !existing.active
        ) {
          throw new Error(
            `Existing market ${market.code} conflicts with the approved initial definition`,
          )
        }
        rows.push({ id: existing.id, code: market.code, created: false })
        continue
      }
      const [created] = await transaction<{ id: number }[]>`
        INSERT INTO markets (code, name_en, name_vi, default_currency)
        VALUES (${market.code}, ${market.nameEn}, ${market.nameVi}, ${market.currency})
        ON CONFLICT (code) DO NOTHING
        RETURNING id
      `
      if (!created) {
        const [concurrent] = await transaction<{
          id: number
          nameEn: string
          nameVi: string
          currency: string
          active: boolean
        }[]>`
          SELECT id, name_en AS "nameEn", name_vi AS "nameVi",
            default_currency AS currency, active
          FROM markets WHERE code = ${market.code} FOR UPDATE
        `
        if (
          !concurrent ||
          concurrent.nameEn !== market.nameEn ||
          concurrent.nameVi !== market.nameVi ||
          concurrent.currency !== market.currency ||
          !concurrent.active
        ) {
          throw new Error(
            `Existing market ${market.code} conflicts with the approved initial definition`,
          )
        }
        rows.push({ id: concurrent.id, code: market.code, created: false })
        continue
      }
      await transaction`
        INSERT INTO audit_events (
          market_id, actor_id, action, resource_type, resource_id,
          request_id, safe_diff, result
        ) VALUES (
          ${created.id}, ${actor.id}, 'access.market_initialized', 'market',
          ${created.id}, ${randomUUID()},
          ${transaction.json({ marketCode: market.code, defaultCurrency: market.currency })},
          'SUCCESS'
        )
      `
      rows.push({ id: created.id, code: market.code, created: true })
    }
    return rows
  })
  for (const market of result) {
    process.stdout.write(
      `${market.code}\t${market.id}\t${market.created ? 'created' : 'existing'}\n`,
    )
  }
  process.stdout.write(
    'Assign active user market memberships through the M29 market-membership API; this command does not grant memberships.\n',
  )
}

/**
 * Activates the approved M07 Product Specifications grants (owner decision 5,
 * 2026-11-11): admin and manager receive the full set, sale is read-only and
 * accountant receives nothing because the role is not activated in R1.
 */
async function grantSpecifications() {
  const actorEmail = option('--actor-email')?.trim().toLowerCase()
  if (!actorEmail) throw new Error('--actor-email is required')
  const result = await sql.begin(async (transaction) => {
    const [actor] = await transaction<{ id: number }[]>`
      SELECT users.id
      FROM users
      JOIN user_roles ON user_roles.user_id = users.id
      JOIN role_grants ON role_grants.role_code = user_roles.role_code
      WHERE users.email = ${actorEmail}
        AND users.status = 'ACTIVE'
        AND user_roles.active
        AND user_roles.role_code = 'admin'
        AND role_grants.active
        AND role_grants.resource = 'access.grants'
        AND role_grants.action = 'manage'
      LIMIT 1
      FOR UPDATE OF users
    `
    if (!actor) throw new Error('The actor cannot manage role grants')
    let changed = 0
    const assignments: Array<{
      roleCode: 'admin' | 'manager' | 'sale'
      grants: typeof specificationAdminGrants | typeof specificationSaleGrants
    }> = [
      { roleCode: 'admin', grants: specificationAdminGrants },
      { roleCode: 'manager', grants: specificationAdminGrants },
      { roleCode: 'sale', grants: specificationSaleGrants },
    ]
    for (const assignment of assignments) {
      for (const grant of assignment.grants) {
        const rows = await transaction<{ id: number }[]>`
          INSERT INTO role_grants (
            role_code, resource, action, record_scope, read_fields,
            write_fields, active, changed_by
          ) VALUES (
            ${assignment.roleCode}, ${grant.resource}, ${grant.action}, ${grant.recordScope},
            ${[...grant.readFields]}, ${[...grant.writeFields]}, true, ${actor.id}
          )
          ON CONFLICT (role_code, resource, action, record_scope)
          DO UPDATE SET
            read_fields = EXCLUDED.read_fields,
            write_fields = EXCLUDED.write_fields,
            active = true,
            changed_by = EXCLUDED.changed_by,
            updated_at = now(),
            version = role_grants.version + 1
          WHERE role_grants.read_fields IS DISTINCT FROM EXCLUDED.read_fields
            OR role_grants.write_fields IS DISTINCT FROM EXCLUDED.write_fields
            OR role_grants.active IS DISTINCT FROM true
          RETURNING id
        `
        changed += rows.length
      }
    }
    if (changed) {
      await transaction`
        INSERT INTO audit_events (
          actor_id, action, resource_type, request_id, safe_diff, result
        ) VALUES (
          ${actor.id}, 'access.specification_grants_activated', 'role_grant',
          ${randomUUID()},
          ${transaction.json({ grantBoundary: 'M07_SPECIFICATIONS_APPROVED' })},
          'SUCCESS'
        )
      `
    }
    return changed
  })
  process.stdout.write(
    result
      ? `Activated ${result} approved Product Specification role grants.\n`
      : 'Approved Product Specification role grants are already active.\n',
  )
}

async function grantPriceLists() {
  const actorEmail = option('--actor-email')?.trim().toLowerCase()
  if (!actorEmail) throw new Error('--actor-email is required')
  const result = await sql.begin(async (transaction) => {
    const [actor] = await transaction<{ id: number }[]>`
      SELECT users.id
      FROM users
      JOIN user_roles ON user_roles.user_id = users.id
      JOIN role_grants ON role_grants.role_code = user_roles.role_code
      WHERE users.email = ${actorEmail}
        AND users.status = 'ACTIVE'
        AND user_roles.active
        AND user_roles.role_code = 'admin'
        AND role_grants.active
        AND role_grants.resource = 'access.grants'
        AND role_grants.action = 'manage'
      LIMIT 1
      FOR UPDATE OF users
    `
    if (!actor) throw new Error('The actor cannot manage role grants')
    let changed = 0
    const assignments: Array<{
      roleCode: 'admin' | 'manager' | 'sale'
      grants: typeof priceListAdminGrants | typeof priceListSaleGrants
    }> = [
      { roleCode: 'admin', grants: priceListAdminGrants },
      { roleCode: 'manager', grants: priceListAdminGrants },
      { roleCode: 'sale', grants: priceListSaleGrants },
    ]
    for (const assignment of assignments) {
      for (const grant of assignment.grants) {
        const rows = await transaction<{ id: number }[]>`
          INSERT INTO role_grants (
            role_code, resource, action, record_scope, read_fields,
            write_fields, active, changed_by
          ) VALUES (
            ${assignment.roleCode}, ${grant.resource}, ${grant.action}, ${grant.recordScope},
            ${[...grant.readFields]}, ${[...grant.writeFields]}, true, ${actor.id}
          )
          ON CONFLICT (role_code, resource, action, record_scope)
          DO UPDATE SET
            read_fields = EXCLUDED.read_fields,
            write_fields = EXCLUDED.write_fields,
            active = true,
            changed_by = EXCLUDED.changed_by,
            updated_at = now(),
            version = role_grants.version + 1
          WHERE role_grants.read_fields IS DISTINCT FROM EXCLUDED.read_fields
            OR role_grants.write_fields IS DISTINCT FROM EXCLUDED.write_fields
            OR role_grants.active IS DISTINCT FROM true
          RETURNING id
        `
        changed += rows.length
      }
    }
    if (changed) {
      await transaction`
        INSERT INTO audit_events (
          actor_id, action, resource_type, request_id, safe_diff, result
        ) VALUES (
          ${actor.id}, 'access.price_list_grants_activated', 'role_grant',
          ${randomUUID()},
          ${transaction.json({ grantBoundary: 'M08_PRICE_LISTS_APPROVED' })},
          'SUCCESS'
        )
      `
    }
    return changed
  })
  process.stdout.write(
    result
      ? `Activated ${result} approved Price List role grants.\n`
      : 'Approved Price List role grants are already active.\n',
  )
}

async function main() {
  const command = process.argv[2]
  if (command === 'bootstrap-admin') await bootstrapAdmin()
  else if (command === 'invite') await invite()
  else if (command === 'grant-customers') await grantCustomers()
  else if (command === 'grant-contacts') await grantContacts()
  else if (command === 'grant-products') await grantProducts()
  else if (command === 'grant-specifications') await grantSpecifications()
  else if (command === 'grant-price-lists') await grantPriceLists()
  else if (command === 'seed-initial-markets') await seedInitialMarkets()
  else
    throw new Error(
      'Usage: access:operator -- <bootstrap-admin|invite|grant-customers|grant-contacts|grant-products|grant-specifications|grant-price-lists|seed-initial-markets> [options]',
    )
}

main()
  .finally(() => sql.end())
  .catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : 'Access command failed'}\n`,
    )
    process.exitCode = 1
  })
