import { loadEnvConfig } from '@next/env'
import postgres from 'postgres'

export default async function globalTeardown() {
  loadEnvConfig(process.cwd())
  const userId = Number(process.env.E2E_USER_ID)
  const adminUserId = Number(process.env.E2E_ADMIN_USER_ID)
  if (
    !process.env.DATABASE_URL ||
    !Number.isSafeInteger(userId) ||
    !Number.isSafeInteger(adminUserId)
  )
    return
  const client = postgres(process.env.DATABASE_URL, { max: 1, prepare: false })
  try {
    await client.begin(async (transaction) => {
      await transaction`
        DELETE FROM audit_events
        WHERE actor_id IN (${userId}, ${adminUserId})
           OR resource_id IN (${userId}, ${adminUserId})
      `
      await transaction`
        DELETE FROM sessions
        WHERE user_id IN (${userId}, ${adminUserId})
      `
      await transaction`
        DELETE FROM role_grants
        WHERE changed_by = ${adminUserId}
      `
      await transaction`
        DELETE FROM user_roles
        WHERE user_id IN (${userId}, ${adminUserId})
      `
      await transaction`
        DELETE FROM users
        WHERE id IN (${userId}, ${adminUserId})
      `
    })
  } finally {
    await client.end()
  }
}
