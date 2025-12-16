import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@shared/schema'

// Use Replit's PostgreSQL database (PGHOST, PGDATABASE, etc.) or fallback to DATABASE_URL
const connectionString = process.env.PGHOST 
  ? `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE}`
  : process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL or PGHOST is not set')
}

// Configure postgres-js with SSL only for external databases
const isReplitDb = process.env.PGHOST === 'helium'
const connection = postgres(connectionString, {
  ssl: isReplitDb ? false : 'require',
  connection: {
    application_name: 'gospel-era-web'
  },
  idle_timeout: 20,
  max_lifetime: 60 * 30,
  connect_timeout: 30,
  max: 1,
  prepare: false
})

export const db = drizzle(connection, { schema })