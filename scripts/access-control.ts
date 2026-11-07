import { randomBytes, randomUUID, createHash } from 'node:crypto'
import postgres from 'postgres'
import { loadEnvConfig } from '@next/env'
import { hashPassword } from '../src/modules/access-control/infrastructure/password'

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
    await transaction`
      INSERT INTO audit_events (
        actor_id, action, resource_type, resource_id, request_id, safe_diff, result
      ) VALUES (
        ${user.id}, 'access.bootstrap_admin', 'user', ${user.id}, ${randomUUID()},
        ${transaction.json({ roles: ['admin'], grantBoundary: 'M29_ONLY' })}, 'SUCCESS'
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

async function main() {
  const command = process.argv[2]
  if (command === 'bootstrap-admin') await bootstrapAdmin()
  else if (command === 'invite') await invite()
  else
    throw new Error(
      'Usage: access:operator -- <bootstrap-admin|invite> [options]',
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
