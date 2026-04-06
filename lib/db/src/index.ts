import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Supabase uses a certificate chain that Node's pg driver rejects by default.
// Disable strict SSL verification when connecting to Supabase.
const isSupabase = process.env.DATABASE_URL.includes("supabase.co");

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(isSupabase ? { ssl: { rejectUnauthorized: false } } : {}),
});
export const db = drizzle(pool, { schema });

export * from "./schema";
