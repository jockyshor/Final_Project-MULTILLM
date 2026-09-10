import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema.js';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Missing DATABASE_URL in server/.env");
}

// Serverless SQL client (HTTP-based, resilient to connection drops)
const sql = neon(connectionString);

// Type-safe Drizzle ORM client
export const db = drizzle(sql, { schema });

