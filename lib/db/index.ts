// lib/db/index.ts

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Supabase connection configuration
// DATABASE_URL: Pooled connection via PgBouncer (port 6543) - use for queries
// DIRECT_URL: Direct connection (port 5432) - use for migrations

// Create the postgres.js client for Supabase
// Uses the pooled connection by default for better performance with serverless
const connectionString = process.env.DATABASE_URL!

// Configure postgres.js options for Supabase
const sql = postgres(connectionString, {
  // Prepare mode should be disabled when using PgBouncer (transaction mode)
  prepare: false,
  // Connection pool settings
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
})

// Create the Drizzle ORM instance with schema for relational queries
export const db = drizzle(sql, { schema })

// Export a direct connection for migrations (bypasses PgBouncer)
// Use this when running drizzle-kit commands
export const getDirectConnection = () => {
  const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL!
  return postgres(directUrl, {
    max: 1,
    prepare: true,
  })
}

// Export schema for use in other files
export * from './schema'

// Type export for database instance
export type Database = typeof db
