import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// Load .env.local for local development
config({ path: '.env.local' })

export default defineConfig({
  // Schema file location
  schema: './lib/db/schema.ts',

  // Output directory for migrations
  out: './drizzle',

  // Database driver - PostgreSQL for Supabase
  dialect: 'postgresql',

  // Database connection configuration
  // For migrations, use DIRECT_URL (port 5432) to bypass PgBouncer
  // This allows prepared statements which are needed for migrations
  dbCredentials: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL!,
  },

  // Verbose logging during migrations
  verbose: true,

  // Strict mode for schema validation
  strict: true,
})
