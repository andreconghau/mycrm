import { randomBytes, randomUUID } from 'node:crypto'
import { loadEnvConfig } from '@next/env'
import postgres from 'postgres'
import { hashPassword } from '../src/modules/access-control/infrastructure/password'

export default async function globalSetup() {
  loadEnvConfig(process.cwd())
  if (!process.env.DATABASE_URL)
    throw new Error('DATABASE_URL is required for browser tests')
  const email = `e2e-${randomUUID()}@example.test`
  const password = `E2E ${randomBytes(24).toString('base64url')}`
  const adminEmail = `e2e-admin-${randomUUID()}@example.test`
  const adminPassword = `E2E Admin ${randomBytes(24).toString('base64url')}`
  const client = postgres(process.env.DATABASE_URL, { max: 1, prepare: false })
  try {
    await client`
      WITH targets AS (
        SELECT id
        FROM users
        WHERE email LIKE 'e2e-%@example.test'
          AND display_name IN ('Browser Test User', 'Browser Test Admin')
      ),
      deleted_sessions AS (
        DELETE FROM sessions WHERE user_id IN (SELECT id FROM targets)
      ),
      deleted_market_memberships AS (
        DELETE FROM user_market_memberships
        WHERE user_id IN (SELECT id FROM targets)
      ),
      deleted_role_grants AS (
        DELETE FROM role_grants WHERE changed_by IN (SELECT id FROM targets)
      ),
      deleted_user_roles AS (
        DELETE FROM user_roles WHERE user_id IN (SELECT id FROM targets)
      )
      DELETE FROM users WHERE id IN (SELECT id FROM targets)
    `
    const [passwordHash, adminPasswordHash] = await Promise.all([
      hashPassword(password),
      hashPassword(adminPassword),
    ])
    const { userId, adminUserId, marketCode } = await client.begin(
      async (transaction) => {
        const [user] = await transaction<{ id: number }[]>`
        INSERT INTO users (email, display_name, password_hash, status)
        VALUES (${email}, 'Browser Test User', ${passwordHash}, 'ACTIVE')
        RETURNING id
      `
        await transaction`
        INSERT INTO user_roles (user_id, role_code, active, granted_by)
        VALUES (${user.id}, 'sale', true, ${user.id})
      `
        const [admin] = await transaction<{ id: number }[]>`
        INSERT INTO users (email, display_name, password_hash, status)
        VALUES (${adminEmail}, 'Browser Test Admin', ${adminPasswordHash}, 'ACTIVE')
        RETURNING id
      `
        await transaction`
        INSERT INTO user_roles (user_id, role_code, active, granted_by)
        VALUES (${admin.id}, 'admin', true, ${admin.id})
      `
        const [market] = await transaction<{ id: number; code: string }[]>`
        SELECT id, code FROM markets WHERE active ORDER BY code LIMIT 1
      `
        if (!market)
          throw new Error('An active market is required for browser tests')
        await transaction`
        INSERT INTO user_market_memberships (market_id, user_id, active, granted_by)
        VALUES (${market.id}, ${admin.id}, true, ${admin.id})
      `
        await transaction`
        INSERT INTO user_market_memberships (market_id, user_id, active, granted_by)
        VALUES (${market.id}, ${user.id}, true, ${admin.id})
      `
        await transaction`
        INSERT INTO role_grants (
          role_code,
          resource,
          action,
          record_scope,
          read_fields,
          write_fields,
          active,
          changed_by
        ) VALUES (
          'admin',
          'access.grants',
          'read',
          'ALL',
          ARRAY['id'],
          ARRAY[]::text[],
          true,
          ${admin.id}
        )
        ON CONFLICT (role_code, resource, action, record_scope) DO NOTHING
      `
        const priceListReadFields = [
          'id', 'marketId', 'code', 'customerId', 'tier', 'currency', 'validFrom',
          'validTo', 'status', 'effectiveState', 'items', 'selectionType',
          'listedAmount', 'selectedAmount', 'reason', 'selectedBy', 'selectedAt',
          'productId', 'priceListItemId', 'unit',
        ]
        const priceListWriteFields = [
          'code', 'customerId', 'tier', 'currency', 'validFrom', 'validTo',
          'productId', 'specificationVersionId', 'unit', 'priceBasis',
          'priceBasisNote', 'unitPrice', 'minQuantity', 'maxQuantity',
        ]
        const priceListGrantAssignments = [
          ...['create', 'read', 'update', 'approve', 'archive', 'select', 'override'].map((action) => ({ role: 'admin', action, write: action === 'create' || action === 'update' ? priceListWriteFields : [] })),
          ...['create', 'read', 'update', 'approve', 'archive', 'select', 'override'].map((action) => ({ role: 'manager', action, write: action === 'create' || action === 'update' ? priceListWriteFields : [] })),
          ...['read', 'select'].map((action) => ({ role: 'sale', action, write: [] as string[] })),
        ]
        for (const grant of priceListGrantAssignments) {
          await transaction`
          INSERT INTO role_grants (
            role_code, resource, action, record_scope, read_fields,
            write_fields, active, changed_by
          ) VALUES (
            ${grant.role}, 'price_lists', ${grant.action}, 'ALL',
            ${priceListReadFields}, ${grant.write}, true, ${admin.id}
          ) ON CONFLICT (role_code, resource, action, record_scope) DO NOTHING
        `
        }
        await transaction`
        INSERT INTO role_grants (
          role_code,
          resource,
          action,
          record_scope,
          read_fields,
          write_fields,
          active,
          changed_by
        ) VALUES (
          'admin',
          'specifications',
          'read',
          'ALL',
          ARRAY['id', 'marketId', 'productId', 'code', 'currentRevision'],
          ARRAY[]::text[],
          true,
          ${admin.id}
        )
        ON CONFLICT (role_code, resource, action, record_scope) DO NOTHING
      `
        return {
          userId: user.id,
          adminUserId: admin.id,
          marketCode: market.code,
        }
      },
    )
    process.env.E2E_EMAIL = email
    process.env.E2E_PASSWORD = password
    process.env.E2E_USER_ID = String(userId)
    process.env.E2E_ADMIN_EMAIL = adminEmail
    process.env.E2E_ADMIN_PASSWORD = adminPassword
    process.env.E2E_ADMIN_USER_ID = String(adminUserId)
    process.env.E2E_MARKET_CODE = marketCode
  } finally {
    await client.end()
  }
}
