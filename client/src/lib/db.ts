import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@shared/schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set')
}

// Configure postgres-js for Supabase with proper connection settings
const connection = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  connection: {
    application_name: 'gospel-era-web'
  },
  idle_timeout: 20,
  max_lifetime: 60 * 30,
  connect_timeout: 10
})

export const db = drizzle(connection, { schema })