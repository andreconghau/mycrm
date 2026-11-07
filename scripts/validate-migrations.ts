import { randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { loadEnvConfig } from '@next/env'
import postgres from 'postgres'

loadEnvConfig(process.cwd())
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required')

const schema = `migration_validation_${randomBytes(4).toString('hex')}`
if (!/^migration_validation_[0-9a-f]{8}$/.test(schema)) {
  throw new Error('Unsafe validation schema name')
}

const admin = postgres(databaseUrl, { max: 1, prepare: false })
const isolated = postgres(databaseUrl, {
  max: 1,
  prepare: false,
  connection: { search_path: schema },
})

async function main() {
  const root = process.cwd()
  const baseline = await readFile(
    path.join(root, 'docs/structure/01_init_20261106.sql'),
    'utf8',
  )
  const runtime = await readFile(
    path.join(root, 'db/migrations/0001_access_control_runtime.sql'),
    'utf8',
  )
  await admin.unsafe(`CREATE SCHEMA "${schema}"`)
  try {
    await isolated.unsafe(baseline)
    await isolated.unsafe(runtime)
    const [result] = await isolated<
      { tableCount: number; limiterComment: string | null }[]
    >`
      SELECT
        COUNT(*)::integer AS "tableCount",
        obj_description(to_regclass('auth_rate_limits')) AS "limiterComment"
      FROM information_schema.tables
      WHERE table_schema = ${schema}
    `
    if (result.tableCount !== 64 || !result.limiterComment) {
      throw new Error(
        `Unexpected isolated schema result: ${result.tableCount} tables, comment=${Boolean(result.limiterComment)}`,
      )
    }
    process.stdout.write(
      `Migration replay passed in isolated schema ${schema}: ${result.tableCount} tables.\n`,
    )
  } finally {
    await isolated.end()
    await admin.unsafe(`DROP SCHEMA "${schema}" CASCADE`)
  }
}

main()
  .finally(() => admin.end())
  .catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : 'Validation failed'}\n`,
    )
    process.exitCode = 1
  })
