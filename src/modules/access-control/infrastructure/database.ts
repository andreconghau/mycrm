import 'server-only'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres, { type Sql } from 'postgres'
import * as schema from './schema'

type DatabaseState = {
  client?: Sql
  database?: PostgresJsDatabase<typeof schema>
}

const globalState = globalThis as typeof globalThis & {
  seafoodCrmDatabase?: DatabaseState
}

function poolSize() {
  const parsed = Number(process.env.DATABASE_POOL_MAX ?? '5')
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 20 ? parsed : 5
}

export function getDatabase() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
  const state = (globalState.seafoodCrmDatabase ??= {})
  if (!state.client) {
    state.client = postgres(process.env.DATABASE_URL, {
      max: poolSize(),
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    })
    state.database = drizzle(state.client, { schema })
  }
  return state.database!
}
