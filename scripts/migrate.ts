import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import postgres from 'postgres'
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required')

const root = process.cwd()
const baselinePath = path.join(root, 'docs/structure/01_init_20261106.sql')
const migrationDirectory = path.join(root, 'db/migrations')
const sql = postgres(databaseUrl, { max: 1, prepare: false })

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

async function hasTable(name: string) {
  const [row] = await sql<{ exists: boolean }[]>`
    SELECT to_regclass(${`public.${name}`}) IS NOT NULL AS exists
  `
  return row.exists
}

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `

  const baseline = await readFile(baselinePath, 'utf8')
  const baselineVersion = '0000_r1_fresh_schema_20261106'
  const [recordedBaseline] = await sql<{ checksum: string }[]>`
    SELECT checksum FROM schema_migrations WHERE version = ${baselineVersion}
  `

  if (!recordedBaseline) {
    if (!(await hasTable('users'))) {
      await sql.unsafe(baseline)
    }
    await sql`
      INSERT INTO schema_migrations (version, checksum)
      VALUES (${baselineVersion}, ${sha256(baseline)})
    `
  } else if (recordedBaseline.checksum !== sha256(baseline)) {
    throw new Error(
      'The recorded R1 baseline checksum no longer matches the initializer',
    )
  }

  const files = (await readdir(migrationDirectory))
    .filter((file) => /^\d+.*\.sql$/.test(file) && !file.endsWith('.down.sql'))
    .sort()

  for (const file of files) {
    const source = await readFile(path.join(migrationDirectory, file), 'utf8')
    const checksum = sha256(source)
    const [recorded] = await sql<{ checksum: string }[]>`
      SELECT checksum FROM schema_migrations WHERE version = ${file}
    `
    if (recorded) {
      if (recorded.checksum !== checksum) {
        throw new Error(`Migration checksum mismatch: ${file}`)
      }
      continue
    }
    await sql.begin(async (transaction) => {
      await transaction.unsafe(source)
      await transaction`
        INSERT INTO schema_migrations (version, checksum)
        VALUES (${file}, ${checksum})
      `
    })
    process.stdout.write(`Applied ${file}\n`)
  }
}

main()
  .finally(() => sql.end())
  .catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : 'Migration failed'}\n`,
    )
    process.exitCode = 1
  })
